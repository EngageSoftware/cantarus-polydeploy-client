const path = require("path");
const taskLib = require("vsts-task-lib/task");

const deployPath = taskLib.getPathInput("deploy-path", true, true);
const targetUri = taskLib.getInput("target-uri", true);
const apiKey = taskLib.getInput("api-key", true);
const encryptionKey = taskLib.getInput("encryption-key", true);

taskLib.findMatch(deployPath, "**/*.zip").forEach(zipPath => {
  taskLib.debug(`Copying ${zipPath} to ${taskLib.cwd()}`);
  taskLib.cp(zipPath, taskLib.cwd());
});

const result = taskLib
  .tool(path.join(__dirname, "DeployClient.exe"))
  .arg("--target-uri")
  .arg(targetUri)
  .arg("--api-key")
  .arg(apiKey)
  .arg("--encryption-key")
  .arg(encryptionKey)
  .arg("--no-prompt")
  .execSync();

if (result.code != 0) {
  throw new Error(result.error ? result.error.message : result.stderr);
}
