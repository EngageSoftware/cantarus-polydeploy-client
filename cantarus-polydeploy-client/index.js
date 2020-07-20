const path = require("path");
const taskLib = require("azure-pipelines-task-lib/task");

const deployPath = taskLib.getPathInput("deploy-path", true, true);
const targetUri = taskLib.getInput("target-uri", true);
const apiKey = taskLib.getInput("api-key", true);
const encryptionKey = taskLib.getInput("encryption-key", true);
const installationStatusTimeout = taskLib.getInput(
  "installation-status-timeout"
);

taskLib.findMatch(deployPath, "**/*.zip").forEach((zipPath) => {
  taskLib.debug(`Copying ${zipPath} to ${taskLib.cwd()}`);
  taskLib.cp(zipPath, taskLib.cwd());
});

let toolRunner = taskLib
  .tool(path.join(__dirname, "DeployClient.exe"))
  .arg("--target-uri")
  .arg(targetUri)
  .arg("--api-key")
  .arg(apiKey)
  .arg("--encryption-key")
  .arg(encryptionKey)
  .arg("--no-prompt");

if (installationStatusTimeout) {
  toolRunner = toolRunner
    .arg("--installation-status-timeout")
    .arg(installationStatusTimeout);
}

const result = toolRunner.execSync();

if (result.code != 0) {
  throw new Error(result.error ? result.error.message : result.stderr);
}
