"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getSshPushCommands = exports.getSshCopyInstructions = exports.getSshTestCommand = exports.getSshDatabase = exports.getSshEnv = exports.getSshFile = exports.getSshInit = void 0;

var _ink = require("ink");

var _nodeSsh = _interopRequireDefault(require("node-ssh"));

var _username = _interopRequireDefault(require("username"));

var _path = _interopRequireDefault(require("path"));

var _utils = require("./utils");

var _env = require("./env");

var _database = require("./database");

var _paths = require("./paths");

var _palette = require("./palette");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

const getSshInit =
/*#__PURE__*/
function () {
  var _ref = _asyncToGenerator(function* ({
    host,
    user,
    swiffSshKey
  }) {
    // Connect to the remote server via SSH
    // Get the remote env file
    const config = {
      host: host,
      username: user // Get the custom privateKey if it's set

    };
    const swiffSshKeyPath = !(0, _utils.isEmpty)(swiffSshKey) ? {
      swiffSshKeyPath: swiffSshKey
    } : null;
    const connection = yield sshConnect(_objectSpread({}, config, swiffSshKeyPath));
    return connection;
  });

  return function getSshInit(_x) {
    return _ref.apply(this, arguments);
  };
}();

exports.getSshInit = getSshInit;

const getSshFile =
/*#__PURE__*/
function () {
  var _ref2 = _asyncToGenerator(function* ({
    connection,
    from,
    to
  }) {
    let errorMessage; // Download the composer file from the remote server

    yield connection.getFile(to, // To local
    from // From remote
    ).catch(e => errorMessage = `${e}\n${from}`); // If there’s download issues then return the messages

    if (errorMessage) return new Error(errorMessage);
    return;
  });

  return function getSshFile(_x2) {
    return _ref2.apply(this, arguments);
  };
}(); // Connect to the remote server via SSH


exports.getSshFile = getSshFile;

const sshConnect =
/*#__PURE__*/
function () {
  var _ref3 = _asyncToGenerator(function* ({
    host,
    username,
    swiffSshKeyPath
  }) {
    let errorMessage; // Get the local username so we can get the default key below (macOS path)

    const user = yield (0, _username.default)(); // Create a SSH connection

    const ssh = new _nodeSsh.default();
    yield ssh.connect({
      host: host,
      username: username,
      privateKey: !(0, _utils.isEmpty)(swiffSshKeyPath) ? swiffSshKeyPath : `/Users/${user}/.ssh/id_rsa`
    }).catch(error => errorMessage = error);
    if (errorMessage) return new Error(String(errorMessage).includes('config.privateKey does not exist at') ? `Your custom SSH identity file isn’t found at ${(0, _palette.colourAttention)(swiffSshKeyPath)}\n\nCheck the ${(0, _palette.colourAttention)(`SWIFF_CUSTOM_KEY`)} value is correct in your local .env\n\nmacOS path example:\n${(0, _palette.colourAttention)(`SWIFF_CUSTOM_KEY="/Users/${user}/.ssh/id_rsa"`)}` : errorMessage);
    return ssh;
  });

  return function sshConnect(_x3) {
    return _ref3.apply(this, arguments);
  };
}();

const getSshEnv =
/*#__PURE__*/
function () {
  var _ref4 = _asyncToGenerator(function* ({
    host,
    username,
    appPath,
    swiffSshKeyPath
  }) {
    let errorMessage; // Create a SSH connection

    const ssh = yield sshConnect({
      host,
      username,
      swiffSshKeyPath
    }); // If there’s any connection issues then return the messages

    if (ssh instanceof Error) return ssh; // Set where we’ll be downloading the temporary remote .env file

    const backupPath = `${_paths.pathBackups}/.env`; // Download the remote .env file
    // We can’t read the env contents with this package so we have to download
    // then read it

    yield ssh.getFile(backupPath, _path.default.join(appPath, '.env')).catch(error => errorMessage = error); // If there’s any .env download issues then return the messages

    if (errorMessage) return new Error(errorMessage); // Return the contents of the .env file

    const remoteEnv = (0, _env.getParsedEnv)(backupPath);

    if (remoteEnv) {
      // Remove the temporary remote .env file
      yield (0, _utils.cmdPromise)(`rm ${backupPath}`).catch(error => errorMessage = error); // If there’s any .env removal issues then return the messages

      if (errorMessage) return new Error(errorMessage);
    } // Close the SSH connection


    ssh.dispose(); // Return the contents of the env

    return remoteEnv;
  });

  return function getSshEnv(_x4) {
    return _ref4.apply(this, arguments);
  };
}();

exports.getSshEnv = getSshEnv;

const getSshCopyInstructions = ({
  server
}) => `Haven’t added your key to the server?\nUse ssh-copy-id to quickly add your key\neg: ssh-copy-id ${server.user}@${server.host}`; // Build a string of commands to send to child_process.exec


exports.getSshCopyInstructions = getSshCopyInstructions;

const getSshPushCommands = ({
  pushFolders,
  user,
  host,
  workingDirectory,
  swiffSshKey
}) => {
  // Set the custom identity if provided
  const customKey = !(0, _utils.isEmpty)(swiffSshKey) ? `-e "ssh -i ${swiffSshKey}"` : '';
  const flags = `-avzi --delete ${customKey} --exclude '.env'`; // Build the final commands from a list of paths.

  const commandsArray = pushFolders.map(path => `echo 'pathfrom: ${path}' && (rsync ${flags} ${_paths.pathApp}/${path}/ ${user}@${host}:${workingDirectory}/${path}/)`); // Return the commands as a string

  const commandString = commandsArray.join(' && '); // Use grep to filter the rsync output to leave only the added/deleted/modified

  const commandsFiltered = `(${commandString}) | grep --regexp=^pathfrom --regexp=^\\< --regexp=^\\*d`;
  return commandsFiltered;
}; // Build command to test ssh connection


exports.getSshPushCommands = getSshPushCommands;

const getSshTestCommand = (user, host) => `ssh -o BatchMode=yes -o ConnectTimeout=5 ${user}@${host} echo 'SSH access is setup' 2>&1`; // Download a database over SSH to a local folder


exports.getSshTestCommand = getSshTestCommand;

const getSshDatabase =
/*#__PURE__*/
function () {
  var _ref5 = _asyncToGenerator(function* ({
    remoteEnv,
    host,
    user,
    sshAppPath,
    gzipFileName,
    swiffSshKey
  }) {
    let errorMessage;
    const ssh = yield getSshInit({
      host: host,
      user: user,
      swiffSshKey: swiffSshKey
    }); // If there’s connection issues then return the messages

    if (ssh instanceof Error) return ssh; // Dump the database and gzip on the remote server

    yield ssh.execCommand((0, _database.getDbDumpZipCommands)({
      database: remoteEnv.DB_DATABASE,
      user: remoteEnv.DB_USER,
      password: remoteEnv.DB_PASSWORD,
      gzipFilePath: gzipFileName
    }), {
      cwd: sshAppPath
    }).catch(e => errorMessage = e); // If there’s db dump/gzip issues then return the messages

    if (errorMessage) return new Error(errorMessage); // Download the file from the remote server

    const downloadTo = `${_paths.pathBackups}/${gzipFileName}`;
    const sshFile = yield getSshFile({
      connection: ssh,
      from: `${sshAppPath}/${gzipFileName}`,
      to: downloadTo
    });
    if (sshFile instanceof Error) return ssh.dispose() && new Error(`${String(errorMessage).includes('No such file') ? `There was an issue downloading the remote ${(0, _palette.colourAttention)(remoteEnv.DB_DATABASE)} database\n\nMaybe there’s incorrect database settings in the ${(0, _palette.colourAttention)('remote .env')}? \n\n${(0, _palette.colourAttention)(JSON.stringify(remoteEnv, null, 2))}` : errorMessage}`); // Cleanup the database dump on the server

    yield ssh.execCommand(`rm ${gzipFileName}`, {
      cwd: sshAppPath
    }).catch(e => errorMessage = e); // If there’s removal issues then close the connection and return the messages

    if (errorMessage) return ssh.dispose() && new Error(errorMessage); // Close the connection

    ssh.dispose(); // Unzip the database
    // -d : decompress / -f : force overwrite any existing file

    yield (0, _utils.executeCommands)(`gzip -df '${downloadTo}'`);
    return;
  });

  return function getSshDatabase(_x5) {
    return _ref5.apply(this, arguments);
  };
}();

exports.getSshDatabase = getSshDatabase;