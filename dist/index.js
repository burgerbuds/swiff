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
const cli = (0, _meow.default)( // Set the help message shown when the user runs swiff --help
`
    Run ${(0, _palette.colourHighlight)('swiff')} to start the task interface.

    Otherwise use these flags for quick task launches:

    🚀  Push: ${(0, _palette.colourHighlight)('swiff -u')}
    alias 'swiff -push'

    📥  Pull: ${(0, _palette.colourHighlight)('swiff -d')}
    alias 'swiff -pull'

    💫  Database: ${(0, _palette.colourHighlight)('swiff -db')}
    alias 'swiff -database'

    🎩  Composer: ${(0, _palette.colourHighlight)('swiff -c')}
    alias 'swiff -composer'

    Open the backups folder: ${(0, _palette.colourHighlight)('swiff -b')}
    alias 'swiff --backups'
`, {
  flags: {
    push: {
      type: 'boolean',
      default: false,
      alias: 'u'
    },
    pull: {
      type: 'boolean',
      default: false,
      alias: 'd'
    },
    database: {
      type: 'boolean',
      default: false,
      alias: 'db'
    },
    composer: {
      type: 'boolean',
      default: false,
      alias: 'c'
    },
    backups: {
      type: 'boolean',
      default: false,
      alias: 'b'
    }
  }
}); // Catch unhandled rejections

process.on('unhandledRejection', reason => {
  process.exit();
}); // Catch uncaught exceptions

process.on('uncaughtException', error => {
  _fsExtra.default.writeSync(1, `${_chalk.default.red(error)}\n\n`);
});
(0, _ink.render)((0, _ink.h)(_Swiff.default, cli.flags));