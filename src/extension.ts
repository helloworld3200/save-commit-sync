/**
 * Extension module.
 *
 * This sets up the VS Code extension's command entry-point and applies logic in
 * the prepareCommitMsg module to a target branch.
 */
import { report } from "process";
import * as vscode from "vscode";
import { API } from "./api/git";
import { makeAndFillCommitMsg } from "./autofill";
import { getGitExtension,  getCommitMsg, setCommitMsg} from "./gitExtension";

function _validateFoundRepos(git: API) {
  let msg = "";

  if (!git) {
    msg = "Unable to load Git Extension";
  } else if (git.repositories.length === 0) {
    msg =
      "No repos found. Please open a repo or run `git init` then try again.";
  }

  if (msg) {
    vscode.window.showErrorMessage(msg);

    throw new Error(msg);
  }
}

/**
 * Run autofill against one of multiples in the workspace.
 *
 * This is a rare flow.
 *
 * @param sourceControl Of type `vscode.SourceControl` with public `.rootUri`
 *   and private `.rootUri`.
 */
async function _handleRepos(git: API, sourceControl: any) {
  // FIXME: Unfortunately this seems to only pick up the first repo and not find
  // second, etc.
  const selectedRepo = git.repositories.find(repository => {
    const uri = sourceControl._rootUri;
    if (!uri) {
      console.warn("_rootUri not set");
    }
    return repository.rootUri.path === uri.path;
  });

  if (selectedRepo) {
    await makeAndFillCommitMsg(selectedRepo);
  } else {
    vscode.window.showErrorMessage("No repos found");
  }
}

/**
 * Run autofill flow for a single repo in the workspace.
 */
async function _handleRepo(git: API) {
  const targetRepo = git.repositories[0];
  await makeAndFillCommitMsg(targetRepo);
}

/**
 * Choose the relevant repo and apply autofill logic on files there.
 */
async function _chooseRepoForAutofill(uri?: vscode.Uri) {
  const git = getGitExtension()!;
  _validateFoundRepos(git);
  
  vscode.commands.executeCommand("workbench.view.scm");

  if (uri) {
    _handleRepos(git, uri);
  } else {
    _handleRepo(git);
  }
  console.log("in chooserepoforautofill");
}

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

async function saveSingleCommitSync (uri?: vscode.Uri) {

  vscode.window.showInformationMessage("Saving, comitting and syncing...");
  vscode.commands.executeCommand("workbench.view.scm");
  
  await vscode.commands.executeCommand("workbench.action.files.save");
  const git = await getGitExtension()!;
  
  await _handleRepo(git);
  const repo = await git.repositories[0];
  const repoStatus = await repo.status();
  const currentCommitMsg = await getCommitMsg(repo);
  while (currentCommitMsg === "") {
    const currentCommitMsg = await getCommitMsg(repo);
  }

  await vscode.commands.executeCommand("git.stageAll");
  await vscode.commands.executeCommand("git.commitAll");
  await vscode.commands.executeCommand("git.push");
  
}

// Saves single file, commits and syncs.

async function saveCommitSync (uri?: vscode.Uri) {
  
  vscode.window.showInformationMessage("Saving, comitting and syncing...");
  vscode.commands.executeCommand("workbench.view.scm");
  
  await vscode.workspace.saveAll();
  const git = await getGitExtension()!;
  
  await _handleRepo(git);
  const repo = await git.repositories[0];
  console.log(git.repositories.length);
  const repoStatus = await repo.status();
  const currentCommitMsg = await getCommitMsg(repo);
  while (currentCommitMsg === "") {
    const currentCommitMsg = await getCommitMsg(repo);
  }

  await vscode.commands.executeCommand("git.stageAll");
  await vscode.commands.executeCommand("git.commitAll");
  await vscode.commands.executeCommand("git.push");
  
}

// Checks if user has selected configuration to save single file and runs corresponding function.

async function saveCommitSyncCheck (uri?: vscode.Uri) {
  const status = vscode.workspace.getConfiguration("commitMsg");
  const value = status.get("saveCommitAndSyncButtonSavesSingle");
  if (!value) {
    saveSingleCommitSync(uri);
  }
  else {
    saveCommitSync(uri);
  }
}

/**
 * Set up the extension activation.
 *
 * The autofill command as configured in `package.json` will be triggered
 * and run the autofill logic for a repo.
 */
export function activate(context: vscode.ExtensionContext) {
  
  // Autofill command (almost same as original, just renamed in package.json file)

  const disposable = vscode.commands.registerCommand(
    "commitMsg.autofill",
    _chooseRepoForAutofill
  );

  // Disposable hello world test

  const hwTest = vscode.commands.registerCommand(
    "commitMsg.helloWorldTest",
    helloWorldTest
  );
  
  // Fully save, commit and sync utility command

  const saveCommitSyncCommand = vscode.commands.registerCommand(
    "commitMsg.saveCommitSyncCommand",
    saveCommitSync);
  
  const saveSingleCommitSyncCommand = vscode.commands.registerCommand(
    "commitMsg.saveSingleCommitSyncCommand",
    saveSingleCommitSync);
  
  const saveCommitSyncCheckCommand = vscode.commands.registerCommand(
    "commitMsg.saveCommitSyncCheckCommand",
    saveCommitSyncCheck);

  // Pushes commands to subscriptions

  context.subscriptions.push(disposable);
  context.subscriptions.push(hwTest);
  context.subscriptions.push(saveCommitSyncCommand);
  context.subscriptions.push(saveSingleCommitSyncCommand);
  context.subscriptions.push(saveCommitSyncCheckCommand);
}

// prettier-ignore
// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate() { }
