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

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

(0, _updateNotifier.default)({
  pkg: _package.default
}).notify();
const cli = (0, _meow.default)( // Set the help message shown when the user runs swiff --help
`
    Run ${(0, _palette.colourHighlight)('swiff')} to start the task interface.

    Otherwise use these flags for quick task launches:

    📥  Pull: ${(0, _palette.colourHighlight)('swiff -d')}
    alias 'swiff -pull'

    🚀  Push: ${(0, _palette.colourHighlight)('swiff -u')}
    alias 'swiff -push'

    💫  Database: ${(0, _palette.colourHighlight)('swiff -db')}
    alias 'swiff -database'

    🎩  Composer: ${(0, _palette.colourHighlight)('swiff -c')}
    alias 'swiff -composer'

    Open the backups folder: ${(0, _palette.colourHighlight)('swiff -b')}
    alias 'swiff --backups'
`, {
  flags: {
    pull: {
      type: 'boolean',
      alias: 'd'
    },
    push: {
      type: 'boolean',
      alias: 'u'
    },
    database: {
      type: 'boolean',
      alias: 'db'
    },
    composer: {
      type: 'boolean',
      alias: 'c'
    },
    backups: {
      type: 'boolean',
      alias: 'b'
    },
    ssh: {
      type: 'boolean'
    }
  }
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
(0, _ink.render)((0, _ink.h)(_Swiff.default, _extends({}, cli.flags, {
  pkg: cli.pkg
})));