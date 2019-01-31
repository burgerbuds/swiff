"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getEnvIssues = exports.getParsedEnv = exports.setupLocalEnv = exports.getRemoteEnv = void 0;

var _ink = require("ink");

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _dotenv = _interopRequireDefault(require("dotenv"));

var _path = _interopRequireDefault(require("path"));

var _utils = require("./utils");

var _palette = require("./palette");

var _paths = require("./paths");

var _ssh = require("./ssh");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

const createEnv = (fromPath = _paths.pathLocalEnvTemplate, toPath = _paths.pathLocalEnv) => _fsExtra.default.copy(fromPath, toPath);

const setupLocalEnv =
/*#__PURE__*/
function () {
  var _ref = _asyncToGenerator(function* (isInteractive) {
    // Get the local env file
    let localEnv = getParsedEnv(_paths.pathLocalEnv);
    const isEnvMissing = localEnv instanceof Error; // If env isn't available then create one

    if (isEnvMissing) {
      yield createEnv();
      localEnv = getParsedEnv(_paths.pathLocalEnv);
    } // Get a summary of any env issues


    const localEnvIssues = getEnvIssues(localEnv, isEnvMissing, false, isInteractive); // Return the missing settings error or the env contents

    return localEnvIssues ? new Error(localEnvIssues) : localEnv;
  });

  return function setupLocalEnv(_x) {
    return _ref.apply(this, arguments);
  };
}();

exports.setupLocalEnv = setupLocalEnv;

const getParsedEnv = path => {
  const envFile = _dotenv.default.config({
    path: path
  }).parsed;

  return envFile ? envFile : new Error(`Missing .env`);
}; // Check all of the required env settings exist
// TODO: Convert to named parameters


exports.getParsedEnv = getParsedEnv;

const getEnvIssues = (env, isEnvMissing, isRemoteEnv, isInteractive = false, appPath = '', requiredSettings = ['ENVIRONMENT', 'DB_SERVER', 'DB_USER', 'DB_PASSWORD', 'DB_DATABASE']) => {
  // Loop over the array and match against the keys in the users env
  const missingSettings = requiredSettings.filter(setting => !(setting in env) || // Make sure there's an environment defined
  setting === 'ENVIRONMENT' && (0, _utils.isEmpty)(env[setting]) || // Make sure there's a server defined
  setting === 'DB_SERVER' && (0, _utils.isEmpty)(env[setting]) || // Make sure there's a user defined
  setting === 'DB_USER' && (0, _utils.isEmpty)(env[setting]) || // Make sure there's a database defined
  setting === 'DB_DATABASE' && (0, _utils.isEmpty)(env[setting])); // Return the error if any

  return (0, _utils.isEmpty)(missingSettings) ? '' : `${isRemoteEnv ? `Add the following ${missingSettings.length > 1 ? 'values' : 'value'} to the remote .env:\n${(0, _palette.colourNotice)(_path.default.join(sshAppPath, '.env'))}` : `Add the following ${missingSettings.length > 1 ? 'values' : 'value'} to your${isEnvMissing ? ` new` : ''} project .env:\n${(0, _palette.colourNotice)(_paths.pathLocalEnv)}`}\n\n${missingSettings.map(s => `${s}="${(0, _palette.colourNotice)(`value`)}"`).join('\n')}${isInteractive ? `\n\nThen hit [ enter ↵ ] to rerun this task` : ''}`;
};

exports.getEnvIssues = getEnvIssues;

const getRemoteEnv =
/*#__PURE__*/
function () {
  var _ref2 = _asyncToGenerator(function* ({
    sshKeyPath,
    serverConfig,
    isInteractive
  }) {
    // Get the remote env file
    const sshConfig = {
      host: serverConfig.host,
      username: serverConfig.user,
      appPath: serverConfig.appPath,
      port: serverConfig.port,
      sshKeyPath: sshKeyPath // Connect via SSH to get the contents of the remote .env

    };
    const remoteEnv = yield (0, _ssh.getSshEnv)(sshConfig);

    if (remoteEnv instanceof Error) {
      return String(remoteEnv).includes('Error: No such file') ? new Error(`First add an .env file on the remote server:\n  ${(0, _palette.colourNotice)(_path.default.join(serverConfig.appPath, '/.env'))}`) : remoteEnv;
    } // Validate the remote env


    const remoteEnvIssues = getEnvIssues(remoteEnv, remoteEnv === false, true, isInteractive, serverConfig.appPath); // Return the missing settings error or the env contents

    return remoteEnvIssues ? new Error(remoteEnvIssues) : remoteEnv;
  });

  return function getRemoteEnv(_x2) {
    return _ref2.apply(this, arguments);
  };
}();

exports.getRemoteEnv = getRemoteEnv;