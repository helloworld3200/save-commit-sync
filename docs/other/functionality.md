# Functionality

See the [gitCommands.ts](/src/gitCommands.ts) script for implementation details.

UPDATE: Perhaps using untracked is a good idea - although not in the git CLI flow, in the VS Code git integration, new/untracked files would be added when adding _everything_ when nothing is staged. So updates might be needed below. Also, see the use of `git status -u` and similar for `diff-index`, but note that `diff-index` is still preferred because of the choice of staged or not while `status` does not have that ability.

- The extension button must be able to run against **staged** changes only (if any). This will be the most common flow for the initial easy functionality of only committing one file at a time.
    - What is staged only. Not untracked.
    - Command
        - Use the output from `git diff-index --name-status --cached HEAD`. That is staged but not untracked. This was based on [index.js](https://github.com/mcwhittemore/staged-git-files/blob/master/index.js) of another extension.
        - Note `git diff` will not be appropriate here.
- And fallback to **all** changes that would be committed. Nothing is staged then, this is everything, but excluding untracked. (There may be specific behavior here I've assumed because of my smart commit or other VS Code preferences.)
    - Want both staged and unstaged. But not untracked. The downside is that renames won't get picked unless they are staged (since the new file appears untracked).
    - Command
        - Use the output from `git status -s -uno --porcelain`.
        - Use the output from `git diff-index --name-status HEAD`.

Also of interest, to get a summary of changes:

```sh
$ git diff-index --shortstat HEAD
 4 files changed, 131 insertions(+), 96 deletions(-)
```

See more [here](https://github.com/MichaelCurrin/dev-cheatsheets/blob/master/cheatsheets/git/commands/diff-index.md).
