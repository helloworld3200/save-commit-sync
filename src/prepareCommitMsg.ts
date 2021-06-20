/**
 * Prepare commit message.
 *
 * This module ties together logic from modules in the `generate` module. So it is best kept outside
 * that.
 *
 * The "message" is the full commit message. The "file change description" is the description
 * portion, which describes how the files changed.
 *
 * This module doesn't interact with the git CLI or the extension. It just deals with text.
 */
import { lookupDiffIndexAction } from "./generate/action";
import { getConventionType } from "./generate/convCommit";
import { namedFiles, oneChange } from "./generate/message";
import { parseDiffIndex } from "./git/parseOutput";
import { CONVENTIONAL_TYPE } from "./lib/constants";
import { equal } from "./lib/utils";

/**
 * Join two strings together with a space, or just one string if only one is set.
 *
 * Trimming on the outside is necessary, in case only one item is set.
 * Don't both trimming the items before joining them, as this project doesn't need that for where
 * this is used.
 */
export function _cleanJoin(first: string, second: string) {
  return [first, second].join(" ").trim();
}

/**
 * Separate a message into a Conventional Commit type, if any, and the description.
 *
 * Require a colon to exist to detect type prefix. i.e. 'ci' will be considered a description, but 'ci:'
 * will be considered a prefix. This keeps the check simpler as we don't have to match against every
 * type and we don't have to check if we are part of a word e.g. 'circus'.
 */
export function _splitMsg(msg: string) {
  const [prefix, description] = msg.includes(":")
    ? msg.split(":")
    : ["", msg];

  const [customPrefix, typePrefix] = prefix.includes(" ")
    ? prefix.split(" ", 2)
    : ["", prefix];

  return { customPrefix, typePrefix, description: description.trim() };
}

/**
 * Determine what the type prefix should be for a file change, using Conventional Commit standard.
 */
function _prefixFromChanges(line: string) {
  const { x: actionChar, from: filePath } = parseDiffIndex(line);
  const action = lookupDiffIndexAction(actionChar);

  return getConventionType(action, filePath);
}

/**
 * Generate message for a single file change.
 */
export function _msgOne(line: string) {
  // TODO: Pass FileChanges to one and generatePrefix instead of string.
  // Don't unpack as {x, y, from, to}
  // const fileChanges = parseDiffIndex(line)
  const prefix = _prefixFromChanges(line),
    description = oneChange(line);

  return { prefix, description };
}

/**
 * Get single Conventional Commit type from multiple ones.
 *
 * If at least one item is build dependencies even if the others are different, then use that.
 * This covers the case where package.json may have non-package changes but you know it does
 * in this case because it changed with the lock file.
 */
function _collapse(conventions: CONVENTIONAL_TYPE[]) {
  if (equal(conventions)) {
    return conventions[0];
  }
  if (conventions.includes(CONVENTIONAL_TYPE.BUILD_DEPENDENCIES)) {
    return CONVENTIONAL_TYPE.BUILD_DEPENDENCIES;
  }

  return CONVENTIONAL_TYPE.UNKNOWN;
}

/**
 * Generate message for multiple file changes.
 *
 * This finds a common Conventional Commit prefix if one is appropriate and returns a message
 * listing all the names.
 *
 * This was added onto this extension later in development, while `_msgOne` was the core behavior
 * previously.
 */
export function _msgMulti(lines: string[]) {
  const conventions = lines.map(_prefixFromChanges);
  const convention = _collapse(conventions);

  return { prefix: convention, description: namedFiles(lines) };
}

/**
 * Generate message from changes to one or more files.
 *
 * Return conventional commit prefix and a description of changed paths.
 */
export function _msgFromChanges(diffIndexLines: string[]) {
  if (diffIndexLines.length === 1) {
    const line = diffIndexLines[0];
    return _msgOne(line);
  }

  return _msgMulti(diffIndexLines);
}

/**
 * Output a readable conventional commit message.
 */
export function _formatMsg(prefix: CONVENTIONAL_TYPE, description: string) {
  if (prefix === CONVENTIONAL_TYPE.UNKNOWN) {
    return description;
  }
  return `${prefix}: ${description}`;
}

/**
 * Generate a new commit message and format it as a string.
 */
export function _newMsg(lines: string[]) {
  const { prefix, description } = _msgFromChanges(lines);

  return _formatMsg(prefix, description);
}

/**
 * Create a commit message using an existing message and generated pieces.
 *
 * The point is to always use the new message and prefix, but respect the old message. If there is
 * no new prefix type set, use the old one, and if that is not set then just a simple message will
 * do.
 *
 * See the "common scenarios" part of `prepareCommitMsg.test.ts` test spec.
 *
 * @param autoType The Conventional Commit type to use, as auto-generated by the extension, based on
 *   changed files.
 * @param autoDesc A description of file changes, also auto-generated.
 * @param oldMsg What exists in the commit message box at the time the extension is run, whether
 *   typed manually or generated previously by the extension. It could be a mix of custom prefix,
 *   type and description.
 */
export function _combineOldAndNew(
  autoType: CONVENTIONAL_TYPE,
  autoDesc: string,
  oldMsg?: string
) {
  if (!oldMsg) {
    return _formatMsg(autoType, autoDesc);
  }

  const {
    customPrefix: oldCustomPrefix,
    typePrefix: oldType,
    description: oldDesc,
  } = _splitMsg(oldMsg);

  const descResult = _cleanJoin(oldDesc, autoDesc);

  if (autoType !== CONVENTIONAL_TYPE.UNKNOWN) {
    return `${_cleanJoin(oldCustomPrefix, autoType)}: ${descResult}`;
  }

  if (oldType) {
    return `${_cleanJoin(
      oldCustomPrefix,
      oldType
    )}: ${descResult}`;
  }

  return descResult;
}

/**
 * Generate commit message using existing message and new generated message.
 *
 * High-level function to process file changes and an old message to generate replacement commit
 * message. Old message must be given, but it can be an empty string.
 */
function _generateMsgWithOld(fileChanges: string[], oldMsg: string) {
  if (oldMsg === "") {
    throw new Error(
      "Either `oldMsg` must not be empty, or use `generateNewMsg` instead."
    );
  }
  const { prefix, description } = _msgFromChanges(fileChanges);

  return _combineOldAndNew(prefix, description, oldMsg);
}

/**
 * Generate commit message.
 *
 * This is a public wrapper function to allow an existing message to be set or not.
 *
 * Old message could be the current commit message value in the UI box (which might be a commit
 * message template that VS Code has filled in), or a commit message template read from a file in
 * the case of a hook flow without VS Code.
 */
export function generateMsg(fileChanges: string[], oldMsg?: string): string {
  if (!oldMsg) {
    return _newMsg(fileChanges);
  } else {
    return _generateMsgWithOld(fileChanges, oldMsg);
  }
}
