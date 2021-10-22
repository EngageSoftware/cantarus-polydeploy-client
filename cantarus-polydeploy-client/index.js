const path = require("path");
const taskLib = require("azure-pipelines-task-lib/task");

const deployPath = taskLib.getPathInput("deploy-path", true, true);
const targetUri = taskLib.getInput("target-uri", true);
const apiKey = taskLib.getInput("api-key", true);
const encryptionKey = taskLib.getInput("encryption-key", true);
const installationStatusTimeout = taskLib.getInput(
  "installation-status-timeout"
);

const deployDirName = `deploy-${Date.now()}`;
const deployDirPath = path.join(taskLib.cwd(), deployDirName);
taskLib.mkdirP(deployDirPath);

taskLib.findMatch(deployPath, "**/*.zip").forEach((zipPath) => {
  taskLib.debug(`Copying ${zipPath} to ${deployDirPath}`);
  taskLib.cp(zipPath, deployDirPath);
});

taskLib.cd(deployDirPath);

let toolRunner = taskLib
  .tool("DeployClient.exe")
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

toolRunner.exec().then(
  () => {
    taskLib.setResult(taskLib.TaskResult.Succeeded, "Deploy succeeded");
  },
  (err) => {
    taskLib.error(err.message);
    taskLib.setResult(taskLib.TaskResult.Failed, "Deploy failed");
  }
);
