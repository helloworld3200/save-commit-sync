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
  
  vscode.window.showInformationMessage("Saving, comitting and syncing...");
  vscode.commands.executeCommand("workbench.view.scm");

  const git = await getGitExtension()!;
  const repo = await git.repositories[0];
  
  const config = vscode.workspace.getConfiguration("saveCommitSync");
  const autofill = config.get("autofillCommitMessageWhenBoxIsEmpty");
  let gitCommitMsg = await getCommitMsg(repo);
  const messageIsEmpty = gitCommitMsg === "";
  const noMessageAlert = "No commit message was provided. If you want to autofill the commit message, enable it in settings.";
  
  if (files === "multi") {
    await vscode.workspace.saveAll();
  }
  else {
    await vscode.commands.executeCommand("workbench.action.files.save");
  }

  if (messageIsEmpty && autofill) {
    await vscode.commands.executeCommand("commitMsg.autofill");
    const repoStatus = await repo.status();
    gitCommitMsg = await getCommitMsg(repo);
    while (gitCommitMsg === "") {
      const currentCommitMsg = await getCommitMsg(repo);
    }
  } else if (messageIsEmpty && !autofill) {
    vscode.commands.executeCommand(noMessageAlert);
    return noMessageAlert;
  }

  await vscode.commands.executeCommand("git.stageAll");
  await vscode.commands.executeCommand("git.commitAll");
  await vscode.commands.executeCommand("git.push");
  
}

// Checks if user has selected configuration to save single file and runs corresponding function.

async function saveCommitSyncCheck (uri?: vscode.Uri) {
  const status = vscode.workspace.getConfiguration("saveCommitSync");
  const value = status.get("saveCommitAndSyncButtonSavesSingleFile");
  if (value) {
    saveSingleCommitSync(uri);
  }
  else {
    saveAllCommitSync(uri);
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
