const fs = require("fs");
const util = require("util");
const semver = require("semver");
const taskLib = require("azure-pipelines-task-lib");
const toolLib = require("azure-pipelines-tool-lib/tool");

const readFile = util.promisify(fs.readFile);

function getDeployClientAsset(release) {
  const assets = release.assets.filter((asset) =>
    asset.name.startsWith("DeployClient_")
  );
  return assets[0];
}

function isValidRelease(release) {
  if (!release || release.draft || release.prerelease || !release.tag_name) {
    return false;
  }

  return Boolean(getDeployClientAsset(release));
}

function downloadUrl(url, version) {
  return toolLib
    .downloadTool(url)
    .then((downloadPath) => toolLib.extractZip(downloadPath))
    .then((unzippedPath) =>
      toolLib.cacheDir(unzippedPath, "DeployClient.exe", version)
    )
    .then((cachePath) => toolLib.prependPath(cachePath));
}

function downloadDeployClient(versionSpec) {
  let version;
  return toolLib
    .downloadTool("https://api.github.com/repos/cantarus/PolyDeploy/releases")
    .then((downloadPath) => readFile(downloadPath, "utf8"))
    .then((releasesJson) => JSON.parse(releasesJson.toString().trim()))
    .then((releases) => releases.filter(isValidRelease))
    .then((releases) =>
      releases.reduce(
        (map, release) =>
          map.set(toolLib.cleanVersion(release.tag_name), release),
        new Map()
      )
    )
    .then((releases) => {
      version = toolLib.evaluateVersions(
        Array.from(releases.keys()),
        versionSpec
      );
      return releases.get(version);
    })
    .then((release) => getDeployClientAsset(release))
    .then((asset) => asset.browser_download_url)
    .then((url) => downloadUrl(url, version))
    .then(() => version);
}

function main() {
  const customDownloadUrl = taskLib.getInput("customDownloadUrl");
  const versionSpec =
    taskLib.getInput("versionSpec", true) +
    (customDownloadUrl ? "-custom" : "");
  const checkLatest = toolLib.isExplicitVersion(versionSpec)
    ? false
    : taskLib.getBoolInput("checkLatest", true);

  let toolPath;
  if (!checkLatest) {
    toolPath = toolLib.findLocalTool("DeployClient.exe", versionSpec);
  }

  if (toolPath) {
    taskLib.setResult(
      taskLib.TaskResult.Succeeded,
      "Using cached DeployClient from " + toolPath
    );
    return Promise.resolve();
  }

  if (customDownloadUrl) {
    const version = semver.coerce(versionSpec).version + "-custom";
    return downloadUrl(customDownloadUrl, version).then(
      () => {
        taskLib.setResult(
          taskLib.TaskResult.Succeeded,
          "Downloaded custom DeployClient " +
            versionSpec +
            " from " +
            customDownloadUrl
        );
      },
      (err) => {
        taskLib.error(err.message);
        taskLib.setResult(
          taskLib.TaskResult.Failed,
          "Unable to download custom DeployClient " +
            versionSpec +
            " from " +
            customDownloadUrl
        );
      }
    );
  }

  return downloadDeployClient(versionSpec).then(
    (version) => {
      taskLib.setResult(
        taskLib.TaskResult.Succeeded,
        "Downloaded DeployClient v" + version
      );
    },
    (err) => {
      taskLib.error(err.message);
      taskLib.setResult(
        taskLib.TaskResult.Failed,
        "Unable to download DeployClient " + versionSpec
      );
    }
  );
}

main();
