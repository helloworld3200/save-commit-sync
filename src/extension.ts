import * as vscode from 'vscode';

import { GitExtension, Repository } from './api/git';
import { Git } from './gitCommands';
import { one } from './generate/message';

/**
 * Return the VS Code builtin Git extension.
 */
function getGitExtension() {
  const vscodeGit = vscode.extensions.getExtension<GitExtension>('vscode.git');
  const gitExtension = vscodeGit && vscodeGit.exports;

  return gitExtension && gitExtension.getAPI(1);
}

/**
 * Fetch Git Extension commit message.
 *
 * This will be useful when doing semantic commits, as the initial 'feat' or 'feat: ' portion
 * or similar can be kept as a prefix while the generate message can be a suffix.
 * Or if left out it can be generated if possible such as for 'chore' or 'docs'.
 */
function getCommitMsg(repository: Repository): string {
  return repository.inputBox.value;
}

/** Replace Git Extension commit message. */
function setCommitMsg(repository: Repository, value: string): void {
  repository.inputBox.value = value;
}

/**
 * Generate a commit message based on file changes and set it in the message box in the Git extension tab.
 *
 * This based on prefixCommit from git-prefix extension.
 */
async function prepareCommitMsg(repository: Repository) {
  const diffIndexLines = await Git.getChanges();

  console.debug(diffIndexLines);

  if (diffIndexLines.length === 0) {
    vscode.window.showWarningMessage('Nothing to commit - no value to set as a message');
    return;
  }
  if (diffIndexLines.length > 1) {
    vscode.window.showErrorMessage(
      "This extension only supports working with ONE changed file at a time. Stage just file (or it's old and new path) and try again. Or with no files staged, ensure that is only one file covered under changed files."
    );
    return;
  }

  const line = diffIndexLines[0];
  const msg = one(line);
  setCommitMsg(repository, msg);
}

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('commitMsg.setMessage', async (uri?) => {
    const git = getGitExtension();

    if (!git) {
      vscode.window.showErrorMessage('Unable to load Git Extension');
      return;
    }

    vscode.commands.executeCommand('workbench.view.scm');

    if (uri) {
      const selectedRepository = git.repositories.find((repository) => {
        return repository.rootUri.path === uri._rootUri.path;
      });

      if (selectedRepository) {
        await prepareCommitMsg(selectedRepository);
      }
    } else {
      if (git.repositories.length === 0) {
        vscode.window.showErrorMessage('No repos found');
        return;
      }
      // Behavior for multiple repos is not implemented yet. Just handle one.
      if (git.repositories.length > 1) {
        vscode.window.showWarningMessage(
          'This extension is only intended to work for one repo - taking the first'
        );
      }

      prepareCommitMsg(git.repositories[0]);
    }
  });

  context.subscriptions.push(disposable);
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate() {}
