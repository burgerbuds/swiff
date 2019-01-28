"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createConfig = exports.getConfig = exports.setupConfig = void 0;

var _ink = require("ink");

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _get = _interopRequireDefault(require("lodash/get"));

var _paths = require("./paths");

var _utils = require("./utils");

var _palette = require("./palette");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

const createConfig = (fromPath = _paths.pathConfigTemplate, toPath = _paths.pathConfig) => _fsExtra.default.copy(fromPath, toPath);

exports.createConfig = createConfig;

const setupConfig =
/*#__PURE__*/
function () {
  var _ref = _asyncToGenerator(function* (hasNewConfig, isInteractive) {
    // Get config contents
    const config = yield getConfig(); // Build a list of any missing config options

    const missingConfigSettings = getConfigIssues(config, hasNewConfig, isInteractive); // Return the missing settings or the whole env

    return missingConfigSettings ? new Error(missingConfigSettings) : config;
  });

  return function setupConfig(_x, _x2) {
    return _ref.apply(this, arguments);
  };
}();

exports.setupConfig = setupConfig;

const getConfig =
/*#__PURE__*/
function () {
  var _ref2 = _asyncToGenerator(function* () {
    // Make sure we pull a config freshie if user happens to update the options
    delete require.cache[require.resolve(_paths.pathConfig)]; // Load the user config and extract data

    const config = yield new Promise(resolve => resolve(require(_paths.pathConfig)));
    return config;
  });

  return function getConfig() {
    return _ref2.apply(this, arguments);
  };
}(); // Check that the required config settings exist
// TODO: Convert to named parameters


exports.getConfig = getConfig;

const getConfigIssues = (config, hasNewConfig, isInteractive = false) => {
  const requiredSettings = ['server.user', 'server.host', 'server.appPath', 'server.port']; // Loop over the array and match against the keys in the users config

  const missingSettings = requiredSettings.filter(setting => (0, _get.default)(config, setting) === undefined || (0, _get.default)(config, setting).length === 0); // Return the error if any

  return !(0, _utils.isEmpty)(missingSettings) ? `Add the following ${missingSettings.length > 1 ? 'values' : 'value'} to your ${hasNewConfig ? `new config:\n${(0, _palette.colourNotice)(_paths.pathConfig)}` : `${(0, _palette.colourNotice)(_paths.configFileName)}:`}\n\n${missingSettings.map((s, i) => `${(0, _palette.colourNotice)(`— `)} ${s}`).join('\n')}\n\n${isInteractive ? `Then hit [ enter ↵ ] to rerun this task` : ``}
        ` : null;
};