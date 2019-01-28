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
  id: 'pull',
  emoji: '📥',
  title: 'Pull',
  heading: 'Pull files',
  description: 'Download fresh files on the remote server from your pull folders',
  isListed: true,
  needsSetup: true,
  handler: 'handlePull',
  flags: ['pull', 'd']
}, {
  id: 'push',
  emoji: '🚀',
  title: 'Push',
  heading: 'Push files',
  description: 'Upload and sync to the remote server from your push folders',
  isListed: true,
  needsSetup: true,
  handler: 'handlePush',
  flags: ['push', 'u']
}, {
  id: 'database',
  emoji: '💫',
  title: 'Database',
  heading: 'Database download',
  description: 'Refresh your website database with a remote database',
  isListed: true,
  needsSetup: true,
  handler: 'handleDatabase',
  flags: ['database', 't']
}, {
  id: 'composer',
  emoji: '🎩',
  title: 'Composer',
  heading: 'Composer sync',
  description: 'Refresh your composer files from the remote server',
  isListed: false,
  needsSetup: true,
  handler: 'handleComposer',
  flags: ['composer', 'c']
}, {
  id: 'backups',
  emoji: '🏬',
  title: 'Backups',
  heading: 'Open backups folder',
  description: 'Open the backups folder containing database and composer files',
  isListed: false,
  needsSetup: false,
  handler: 'handleOpenBackups',
  flags: ['backups', 'b']
}, {
  id: 'ssh',
  emoji: '💻',
  title: 'Terminal',
  heading: 'Remote terminal connection',
  description: 'Launch a remote terminal session into the remote app folder',
  isListed: false,
  needsSetup: true,
  fullscreen: true,
  handler: 'handleSsh',
  flags: ['ssh', 's']
}];

const taskInstructions = tasks => tasks.map(task => `${task.emoji}  ${task.description}\n  ${task.flags.map(flag => `${(0, _palette.colourHighlight)(`swiff ${flag.length === 1 ? '-' : '--'}${flag}`)}`).join(' / ')}`).join('\n\n');

const taskHelp = `
Run ${(0, _palette.colourHighlight)('swiff')} within your project folder root to start the task interface.\nOtherwise use the following commands to quickly run a task:\n\n${taskInstructions(tasks)}`;
const taskFlags = tasks.map(task => ({
  [task.flags.shift()]: {
    type: 'boolean',
    alias: task.flags.toString()
  }
}));
const cli = (0, _meow.default)( // Set the help message shown when the user runs swiff --help
taskHelp, {
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
    console.log((0, _palette.colourHighlight)('\n👌  Your SSH connection was ended'));
    process.exit();
  }
});
(0, _ink.render)((0, _ink.h)(_Swiff.default, {
  flags: cli.flags,
  pkg: cli.pkg,
  tasks: tasks,
  taskHelp: taskHelp
}));