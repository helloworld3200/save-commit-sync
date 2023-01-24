/**
 * Extension module.
 */
import * as vscode from "vscode";
import { getGitExtension,  getCommitMsg} from "./gitExtension";

async function helloWorldTest (uri?: vscode.Uri) {
  vscode.window.showInformationMessage("Hello, world!");
}

async function sayYes () {
  console.log("Promise/Thenable resolved (yes)");
}

async function sayNo () {
  console.log("Promise/Thenable unresolved (No)");
}

// Saves all files, autofills, commits all and syncs changes. For utility purposes.

async function saveCommitSync (files: string) {
  
  console.debug("before save");
  vscode.window.showInformationMessage("Saving, comitting and syncing...");
  vscode.commands.executeCommand("workbench.view.scm");
  
  if (files === "multi") {
    await vscode.workspace.saveAll();
  }
  else {
    await vscode.commands.executeCommand("workbench.action.files.save");
  }

  const git = await getGitExtension()!;
  const repo = await git.repositories[0];
  console.debug("at save");
  
  const autofill = vscode.workspace.getConfiguration("saveCommitSync");
  const status = autofill.get("autofillCommitMessage");
  let gitCommitMsg = await getCommitMsg(repo);
  console.debug("before autofill");
  if (status) {
    await vscode.commands.executeCommand("commitMsg.autofill");
  }
  else if (gitCommitMsg === "") {
    const message = "No commit message was provided.";
    vscode.window.showInformationMessage(message);
    return message;
  }
  console.debug("after autofill");
  
  console.debug(git.repositories.length);
  const repoStatus = await repo.status();
  gitCommitMsg = await getCommitMsg(repo);
  console.debug("before timeout");
  console.debug("after timeout");
  while (gitCommitMsg === "") {
    const currentCommitMsg = await getCommitMsg(repo);
  }

  await vscode.commands.executeCommand("git.stageAll");
  await vscode.commands.executeCommand("git.commitAll");
  await vscode.commands.executeCommand("git.push");
  
}

// Checks if user has selected configuration to save single file and runs corresponding function.

async function saveCommitSyncCheck (uri?: vscode.Uri) {
  const status = vscode.workspace.getConfiguration("saveCommitSync");
  const value = status.get("saveCommitAndSyncButtonSavesSingleFile");
  console.debug("value is: "+value);
  if (value) {
    saveSingleCommitSync(uri);
    console.debug("in save single commit sync");
  }
  else {
    saveAllCommitSync(uri);
    console.debug("in save commit sync");
  }
}

async function saveAllCommitSync (uri?: vscode.Uri) {
  saveCommitSync("multi");
}

async function saveSingleCommitSync (uri?: vscode.Uri) {
  saveCommitSync("single");
}

/**
 * Set up the extension activation.
 *
 * The autofill command as configured in `package.json` will be triggered
 * and run the autofill logic for a repo.
 */
export function activate(context: vscode.ExtensionContext) {
  console.debug("sdfsdfsdf");

  // Disposable hello world test

  const hwTest = vscode.commands.registerCommand(
    "saveCommitSync.helloWorldTest",
    helloWorldTest
  );
  
  // Fully save, commit and sync utility command

  const saveCommitSyncCommand = vscode.commands.registerCommand(
    "saveCommitSync.saveCommitSyncCommand",
    saveAllCommitSync);
  
  const saveSingleCommitSyncCommand = vscode.commands.registerCommand(
    "saveCommitSync.saveSingleCommitSyncCommand",
    saveSingleCommitSync);
  
  const saveCommitSyncCheckCommand = vscode.commands.registerCommand(
    "saveCommitSync.saveCommitSyncCheckCommand",
    saveCommitSyncCheck);

  // Pushes commands to subscriptions

  context.subscriptions.push(hwTest);
  context.subscriptions.push(saveCommitSyncCommand);
  context.subscriptions.push(saveSingleCommitSyncCommand);
  context.subscriptions.push(saveCommitSyncCheckCommand);
}

// prettier-ignore
// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate() { }
