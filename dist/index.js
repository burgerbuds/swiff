#!/usr/bin/env node
"use strict";

var _ink = require("ink");

var _meow = _interopRequireDefault(require("meow"));

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _chalk = _interopRequireDefault(require("chalk"));

var _Swiff = _interopRequireDefault(require("./Swiff"));

var _palette = require("./palette");

var _updateNotifier = _interopRequireDefault(require("update-notifier"));

var _package = _interopRequireDefault(require("./../package.json"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Notify when there's an update available
(0, _updateNotifier.default)({
  pkg: _package.default
}).notify();
const tasks = [{
  id: 'pull-folders',
  emoji: '📥',
  title: 'Folder pull',
  heading: 'Folder pull',
  description: 'Update your folders with the remote pull folders',
  isListed: true,
  needsSetup: true,
  handler: 'handlePullFolders',
  flags: ['pull-folders', 'pullfolders', 'pullf', 'folderpull', 'df', 'downf']
}, {
  id: 'pull-database',
  emoji: '💫',
  title: 'Database pull',
  heading: 'Database pull',
  description: 'Replace your database with the remote database',
  isListed: true,
  needsSetup: true,
  handler: 'handlePullDatabase',
  flags: ['pull-database', 'pulldb', 'dbpull', 'pulld', 'ddb']
}, {
  id: 'pull-composer',
  emoji: '🎩',
  title: 'Composer pull',
  heading: 'Composer pull',
  description: 'Update your project with the remote composer files',
  isListed: true,
  needsSetup: true,
  handler: 'handlePullComposer',
  flags: ['pull-composer', 'pullcomposer', 'pullcomp', 'pullc']
}, {
  id: 'push-folders',
  emoji: '🚀',
  title: 'Folder push',
  heading: 'Folder push',
  description: 'Update the remote folders with your push folders',
  isListed: true,
  needsSetup: true,
  handler: 'handlePushFolders',
  flags: ['push-folders', 'pushfolders', 'pushf', 'folderpush', 'uf', 'upf']
}, {
  id: 'push-database',
  emoji: '💫',
  title: 'Database push',
  heading: 'Database push',
  description: 'Replace the remote database with your local database',
  isListed: true,
  needsSetup: true,
  fullscreen: true,
  handler: 'handlePushDatabase',
  flags: ['push-database', 'pushdb', 'dbpush', 'pushd', 'udb', 'updb', 'uploaddb']
}, {
  id: 'push-composer',
  emoji: '🎩',
  title: 'Composer push',
  heading: 'Composer push',
  description: 'Update the remote with your local composer files',
  isListed: true,
  needsSetup: true,
  handler: 'handlePushComposer',
  flags: ['push-composer', 'pushcomposer', 'pushcomp', 'pushc']
}, {
  id: 'backups',
  emoji: '🏬',
  title: 'View backups',
  heading: 'Open backups folder',
  description: 'View your gzipped database and composer backups',
  isListed: true,
  needsSetup: false,
  handler: 'handleOpenBackups',
  flags: ['backups', 'b']
}, {
  id: 'ssh',
  emoji: '💻',
  title: 'Terminal',
  heading: 'Remote terminal connection',
  description: 'Launch a remote terminal session into the remote app folder',
  isListed: true,
  needsSetup: true,
  fullscreen: true,
  handler: 'handleSsh',
  flags: ['ssh', 's']
}];

const taskInstructions = (tasks, isVerbose) => tasks.map(task => `${task.emoji}  ${_chalk.default.bold(task.title)}: ${(0, _palette.colourHighlight)(`swiff ${task.flags[0].length === 1 ? '-' : '--'}${task.flags[0]}`)}${isVerbose ? `\n  ${task.description}` : ''}\n  Aliases: ${task.flags.slice(1).map(flag => `${flag.length === 1 ? '-' : '--'}${flag}`).join(', ')}`).join('\n\n');

const taskHelp = (isVerbose = false) => `
${isVerbose ? `💁  Run ${(0, _palette.colourHighlight)('swiff')} within your project root for an interactive interface.\nOtherwise use the following commands to quickly run a task:` : `Try one of the following flags:`}\n\n${taskInstructions(tasks, isVerbose)}`;

const taskFlags = tasks.map(task => ({
  [task.flags.slice().shift()]: {
    type: 'boolean',
    alias: task.flags.toString()
  }
}));
const cli = (0, _meow.default)( // Set the help message shown when the user runs swiff --help
taskHelp(true), {
  description: false,
  flags: Object.assign(...taskFlags)
}); // Catch unhandled rejections

process.on('unhandledRejection', reason => {
  process.exit();
}); // Catch uncaught exceptions

process.on('uncaughtException', error => {
  _fsExtra.default.writeSync(1, `${_chalk.default.red(error)}\n\n`);
}); // End process on ctrl+c or ESC

process.stdin.on('data', key => {
  if (['\u0003', '\u001B'].includes(key)) {
    console.log((0, _palette.colourHighlight)('\n👌  Your SSH connection has ended'));
    process.exit();
  }
});
(0, _ink.render)((0, _ink.h)(_Swiff.default, {
  flags: cli.flags,
  pkg: cli.pkg,
  tasks: tasks,
  taskHelp: taskHelp()
}));