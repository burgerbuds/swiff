"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.sshConnect = exports.pushSshDatabase = exports.getSshPullCommands = exports.getSshPushCommands = exports.getSshCopyInstructions = exports.getSshTestCommand = exports.getSshDatabase = exports.getSshEnv = exports.getSshFile = exports.getSshInit = void 0;

var _nodeSsh = _interopRequireDefault(require("node-ssh"));

var _username = _interopRequireDefault(require("username"));

var _path = _interopRequireDefault(require("path"));

var _utils = require("./utils");

var _env = require("./env");

var _database = require("./database");

var _paths = require("./paths");

var _palette = require("./palette");

var _chalk = _interopRequireDefault(require("chalk"));

var _readlineSync = _interopRequireDefault(require("readline-sync"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { keys.push.apply(keys, Object.getOwnPropertySymbols(object)); } if (enumerableOnly) keys = keys.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

let passphrase;

const getSshInit =
/*#__PURE__*/
function () {
  var _ref = _asyncToGenerator(function* ({
    host,
    user,
    port,
    sshKeyPath
  }) {
    // Connect to the remote server via SSH
    // Get the remote env file
    const config = {
      host: host,
      username: user,
      port: port // Get the custom privateKey if it's set

    };
    sshKeyPath = !(0, _utils.isEmpty)(sshKeyPath) ? {
      sshKeyPath: sshKeyPath
    } : null;
    const connection = yield sshConnect(_objectSpread({}, config, {}, sshKeyPath));
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
    port,
    sshKeyPath
  }) {
    let errorMessage; // Get the local username so we can get the default key below (macOS path)

    const user = yield (0, _username.default)();
    const sshKeyResolvedPath = !(0, _utils.isEmpty)(sshKeyPath) ? sshKeyPath : `/Users/${user}/.ssh/id_rsa`; // Create a SSH connection

    const ssh = new _nodeSsh.default();

    const tryToConnect =
    /*#__PURE__*/
    function () {
      var _ref4 = _asyncToGenerator(function* () {
        errorMessage = null;
        yield ssh.connect({
          host: host,
          username: username,
          port: port,
          privateKey: sshKeyResolvedPath,
          passphrase: passphrase
        }).catch(error => errorMessage = error);

        if (String(errorMessage).includes('Encrypted OpenSSH private key detected, but no passphrase given') || String(errorMessage).includes('Malformed OpenSSH private key. Bad passphrase?')) {
          passphrase = _readlineSync.default.question((String(errorMessage).includes('Malformed') ? 'Incorrect passphrase! ' : '') + 'Please enter the private key’s passphrase: ', {
            hideEchoBack: true
          });
          yield tryToConnect();
        }
      });

      return function tryToConnect() {
        return _ref4.apply(this, arguments);
      };
    }();

    yield tryToConnect();
    if (errorMessage) return new Error(String(errorMessage).includes('Error: Cannot parse privateKey: Unsupported key format') ? `Your SSH key isn't in a format Swiff can work with\n  (${sshKeyResolvedPath})\n\n1. Generate a new one with:\n  ${(0, _palette.colourNotice)(`ssh-keygen -m PEM -b 4096 -f /Users/${user}/.ssh/swiff`)}\n\n2. Then add the key to the server:\n  ${(0, _palette.colourNotice)(`ssh-copy-id -i /Users/${user}/.ssh/swiff ${port !== 22 ? `-p ${port} ` : ''}${username}@${host}`)}` : String(errorMessage).includes('config.privateKey does not exist at') ? `Your SSH key isn’t found at ${(0, _palette.colourAttention)(sshKeyResolvedPath)}\n\nCheck the ${(0, _palette.colourAttention)(`SWIFF_CUSTOM_KEY`)} value is correct in your local .env\n\nmacOS path example:\n${(0, _palette.colourAttention)(`SWIFF_CUSTOM_KEY="/Users/${user}/.ssh/[key-filename]"`)}` : errorMessage);
    return ssh;
  });

  return function sshConnect(_x3) {
    return _ref3.apply(this, arguments);
  };
}();

exports.sshConnect = sshConnect;

const getSshEnv =
/*#__PURE__*/
function () {
  var _ref5 = _asyncToGenerator(function* ({
    host,
    username,
    port,
    appPath,
    sshKeyPath
  }) {
    let errorMessage; // Create a SSH connection

    const ssh = yield sshConnect({
      host,
      username,
      port,
      sshKeyPath
    }); // If there’s any connection issues then return the messages

    if (ssh instanceof Error) return ssh; // Set where we’ll be downloading the temporary remote .env file

    const tempBackupPath = _path.default.join(_paths.pathBackups, '.env'); // Download the remote .env file
    // We can’t read the env contents with this package so we have to download
    // then read it


    yield ssh.getFile(tempBackupPath, _path.default.join(appPath, '.env')).catch(error => errorMessage = error); // If there’s any .env download issues then return the messages

    if (errorMessage) {
      // If dispose is a function call it
      if (ssh.dispose() && {}.toString.call(ssh.dispose()) === '[object Function]') ssh.dispose();
      return new Error(errorMessage);
    } // Return the contents of the .env file


    const remoteEnv = (0, _env.getParsedEnv)(tempBackupPath);

    if (remoteEnv) {
      // Remove the temporary remote .env file
      yield (0, _utils.cmdPromise)(`rm ${tempBackupPath}`).catch(error => errorMessage = error); // If there’s any .env removal issues then return the messages

      if (errorMessage) {
        if (ssh.dispose() && {}.toString.call(ssh.dispose()) === '[object Function]') ssh.dispose();
        return new Error(errorMessage);
      }
    } // Close the SSH connection


    ssh.dispose(); // Return the contents of the env

    return remoteEnv;
  });

  return function getSshEnv(_x4) {
    return _ref5.apply(this, arguments);
  };
}();

exports.getSshEnv = getSshEnv;

const getSshCopyInstructions = ({
  server
}, sshKeyPath) => `${_chalk.default.bold(`Haven’t added your key to the server?`)}\nYou can quickly add it with ssh-copy-id:\n${(0, _palette.colourNotice)(`ssh-copy-id ${!(0, _utils.isEmpty)(sshKeyPath) ? `-i ${sshKeyPath} ` : ''}${server.port !== 22 ? `-p ${server.port} ` : ''}${server.user}@${server.host}`)}`;

exports.getSshCopyInstructions = getSshCopyInstructions;

const getSshPushCommands = ({
  pushFolders,
  user,
  host,
  port,
  workingDirectory,
  sshKeyPath
}) => {
  // https://download.samba.org/pub/rsync/rsync.html
  const flags = [// '--dry-run',
  // Preserve permissions
  '--archive', // Compress file data during the transfer
  '--compress', // Output a change-summary for all updates
  '--itemize-changes', // Delete extraneous files from dest dirs
  '--delete', // Ignore misc files
  '--exclude ".git"', '--exclude ".env"', '--exclude ".DS_Store"', // Connect via a port number
  // Set the custom identity if provided
  `-e "ssh -p ${port}${!(0, _utils.isEmpty)(sshKeyPath) ? ` -i '${sshKeyPath}'` : ''}"`]; // Build the final command string from an array of folders

  const rsyncCommands = pushFolders.map(item => {
    let localPath = item;
    let excludePattern;

    if (typeof item !== "string") {
      localPath = item.path;
      excludePattern = item.exclude || "";

      if (excludePattern) {
        flags.push(`--exclude "${excludePattern}"`);
      }
    }

    const rSyncFrom = `${_path.default.join(_paths.pathApp, localPath)}/`;
    const rSyncTo = `${_path.default.join(workingDirectory, localPath)}/`; // Folders aren't created by rsync natively
    // https://stackoverflow.com/questions/1636889/rsync-how-can-i-configure-it-to-create-target-directory-on-server

    const createFolderCmd = `--rsync-path="mkdir -p ${rSyncTo} && rsync"`;
    const flagsFlat = flags.join(" ");
    return [`echo '!${localPath}'`, `(rsync ${createFolderCmd} ${flagsFlat} ${rSyncFrom} ${user}@${host}:${rSyncTo})`].join(' && ');
  }).join(' && '); // Use grep to filter the rsync output

  const greppage = `grep -E '^(!|>|<|\\*)'`;
  return `(${rsyncCommands}) | ${greppage}`;
};

exports.getSshPushCommands = getSshPushCommands;

const getPushDatabaseCommands = ({
  host,
  user,
  port,
  fromPath,
  toPath,
  sshKeyPath
}) => {
  // https://download.samba.org/pub/rsync/rsync.html
  const flags = [// '--dry-run',
  // Preserve permissions
  '--archive', // Compress file data during the transfer
  '--compress', // Connect via a port number
  // Set the custom identity if provided
  `-e "ssh -p ${port}${!(0, _utils.isEmpty)(sshKeyPath) ? ` -i '${sshKeyPath}'` : ''}"`].join(' '); // Build the command string

  return `rsync ${flags} ${fromPath} ${user}@${host}:${toPath}`;
};

const getSshPullCommands = ({
  pullFolders,
  user,
  host,
  port,
  appPath,
  sshKeyPath
}) => {
  // https://download.samba.org/pub/rsync/rsync.html
  const flags = [// '--dry-run',
  // Preserve permissions
  '--archive', // Compress file data during the transfer
  '--compress', // Output a change-summary for all updates
  '--itemize-changes', // Ignore misc files
  '--exclude ".git"', '--exclude ".env"', '--exclude ".DS_Store"', // Connect via a port number
  // Set the custom identity if provided
  `-e "ssh -p ${port}${!(0, _utils.isEmpty)(sshKeyPath) ? ` -i '${sshKeyPath}'` : ''}"`].join(' '); // Build the final command string from an array of folders

  const rsyncCommands = pullFolders.map(item => {
    const rSyncFrom = `${_path.default.join(appPath, item)}/`;
    const rSyncTo = `./${item}/`; // Folders aren't created by rsync natively

    const createFolderCmd = `mkdir -p ${rSyncTo}`;
    return [`echo '!${item}'`, createFolderCmd, `rsync ${flags} ${user}@${host}:${rSyncFrom} ${rSyncTo}`].join(' && ');
  }).join(';'); // Use grep to filter the rsync output

  const greppage = `grep -E '^(!|>|<|\\*)'`;
  return `(${rsyncCommands}) | ${greppage}`;
}; // Build command to test the SSH connection is setup


exports.getSshPullCommands = getSshPullCommands;

const getSshTestCommand = (user, host, port, sshKeyPath) => {
  // Set the custom identity if provided
  const sshKeyString = !(0, _utils.isEmpty)(sshKeyPath) ? `-i "${sshKeyPath}"` : '';
  return `ssh -p ${port} ${sshKeyString} -o BatchMode=yes -o ConnectTimeout=5 ${user}@${host} echo 'SSH access is setup' 2>&1`;
}; // Upload a database over SSH to a remote folder


exports.getSshTestCommand = getSshTestCommand;

const pushSshDatabase =
/*#__PURE__*/
function () {
  var _ref6 = _asyncToGenerator(function* (config) {
    const pushDatabaseStatus = yield (0, _utils.executeCommands)(getPushDatabaseCommands(config));
    if (pushDatabaseStatus instanceof Error) return new Error(`There was an issue uploading your local ${(0, _palette.colourAttention)(config.dbName)} database\n\n${pushDatabaseStatus}`);
    return;
  });

  return function pushSshDatabase(_x5) {
    return _ref6.apply(this, arguments);
  };
}(); // Download a database over SSH to a local folder


exports.pushSshDatabase = pushSshDatabase;

const getSshDatabase =
/*#__PURE__*/
function () {
  var _ref7 = _asyncToGenerator(function* ({
    remoteEnv,
    host,
    user,
    port,
    sshAppPath,
    gzipFileName,
    sshKeyPath,
    unzip = false
  }) {
    const ssh = yield getSshInit({
      host: host,
      user: user,
      port: port,
      sshKeyPath: sshKeyPath
    }); // If there’s connection issues then return the messages

    if (ssh instanceof Error) return ssh; // Dump the database and gzip on the remote server

    const zipCommandConfig = {
      host: remoteEnv.DB_SERVER,
      port: remoteEnv.DB_PORT,
      user: remoteEnv.DB_USER,
      password: remoteEnv.DB_PASSWORD,
      database: remoteEnv.DB_DATABASE,
      gzipFilePath: gzipFileName,
      isMysql8: yield (0, _database.isMysql8)({
        sshConn: ssh
      })
    };
    let errorMessage;
    yield ssh.execCommand((0, _database.getDbDumpZipCommands)(zipCommandConfig), {
      cwd: sshAppPath
    }).then(result => {
      const errorOutput = String(result.stderr); // There's an error found (mysql makes this check tedious)

      if (errorOutput.toLowerCase().includes('error')) {
        // Close the connection
        ssh.dispose(); // Format the remote env settings for display

        const remoteSettings = `${(0, _palette.colourAttention)(`DB_SERVER="${remoteEnv.DB_SERVER}"\nDB_PORT="${remoteEnv.DB_PORT}"\nDB_USER="${zipCommandConfig.user}"\nDB_PASSWORD="${zipCommandConfig.password}"\nDB_DATABASE="${zipCommandConfig.database}"`)}\n\n${_path.default.join(sshAppPath, '.env')}`; // Set the error message

        errorMessage = errorOutput.includes('Unknown MySQL server host') ? `There were issues connecting to the remote database server ${(0, _palette.colourAttention)(remoteEnv.DB_SERVER)}\nVerify the settings in the remote env are correct:\n\n${remoteSettings}` : errorOutput.includes('Access denied') ? `Couldn’t connect with the remote .env database settings:\n\n${remoteSettings}` : errorOutput;
      }
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

    unzip && (yield (0, _utils.executeCommands)(`gzip -df '${downloadTo}'`));
    return;
  });

  return function getSshDatabase(_x6) {
    return _ref7.apply(this, arguments);
  };
}();

exports.getSshDatabase = getSshDatabase;