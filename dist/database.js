"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.removeDb = exports.importDb = exports.clearDb = exports.unzipDb = exports.checkForDb = exports.importDbQuery = exports.doLocalDbDump = exports.doImportDb = exports.dropDbQuery = exports.doDropAllDbTables = exports.getDbDumpZipCommands = void 0;

var _promiseMysql = _interopRequireDefault(require("promise-mysql"));

var _utils = require("./utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { keys.push.apply(keys, Object.getOwnPropertySymbols(object)); } if (enumerableOnly) keys = keys.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

// CLI Resources:
// https://dev.mysql.com/doc/refman/8.0/en/mysql-command-options.html
// https://mariadb.com/kb/en/library/mysqldump/
// A better solution than dropping and recreating the db.
// It also avoids errors when run on an empty database.
// https://stackoverflow.com/a/18625545
const dropDbQuery = `SET FOREIGN_KEY_CHECKS = 0;SET GROUP_CONCAT_MAX_LEN=32768;SET @tables = NULL;SELECT GROUP_CONCAT('\`', table_name, '\`') INTO @tables FROM information_schema.tables WHERE table_schema = (SELECT DATABASE()); SELECT IFNULL(@tables,'dummy') INTO @tables; SET @tables = CONCAT('DROP TABLE IF EXISTS ', @tables); PREPARE stmt FROM @tables; EXECUTE stmt; DEALLOCATE PREPARE stmt; SET FOREIGN_KEY_CHECKS = 1;`;
exports.dropDbQuery = dropDbQuery;

const importDbQuery = ({
  host = 'localhost',
  port = 3306,
  user,
  password,
  database,
  importFile
}) => `mysql --host='${host}' --port='${!(0, _utils.isEmpty)(port) ? port : 3306}' --user='${user}' --password='${password}' ${database} < ${importFile};`; // Clear out the tables in a database


exports.importDbQuery = importDbQuery;

const doDropAllDbTables =
/*#__PURE__*/
function () {
  var _ref = _asyncToGenerator(function* (config) {
    let errorMessage;
    const defaultConfig = {
      multipleStatements: true,
      host: null,
      user: null,
      password: null,
      database: null,
      socketPath: null // Create the connection to the local database

    };
    const conn = yield _promiseMysql.default.createConnection(_objectSpread({}, defaultConfig, {}, config)).catch(error => errorMessage = error);
    if (errorMessage) return new Error(errorMessage);
    conn.query(dropDbQuery);
    conn.end();
  });

  return function doDropAllDbTables(_x) {
    return _ref.apply(this, arguments);
  };
}();

exports.doDropAllDbTables = doDropAllDbTables;

const doImportDb =
/*#__PURE__*/
function () {
  var _ref2 = _asyncToGenerator(function* (config) {
    let errorMessage;
    yield (0, _utils.cmdPromise)(importDbQuery(config)).catch(e => errorMessage = e);
    if (errorMessage) return new Error(errorMessage);
  });

  return function doImportDb(_x2) {
    return _ref2.apply(this, arguments);
  };
}();

exports.doImportDb = doImportDb;

const doLocalDbDump =
/*#__PURE__*/
function () {
  var _ref3 = _asyncToGenerator(function* (config) {
    let errorMessage;
    yield (0, _utils.cmdPromise)(getDbDumpZipCommands(config)).catch(e => errorMessage = e);
    if (errorMessage) return new Error(errorMessage);
  });

  return function doLocalDbDump(_x3) {
    return _ref3.apply(this, arguments);
  };
}();

exports.doLocalDbDump = doLocalDbDump;

const getDbDumpZipCommands = ({
  host = 'localhost',
  port = 3306,
  user,
  password,
  database,
  gzipFilePath
}) => // Dump and zip the db - this can make it around 9 times smaller
`mysqldump --host='${host}' --port='${port}' --user='${user}' --password='${password}' ${database} | gzip > '${gzipFilePath}'`;

exports.getDbDumpZipCommands = getDbDumpZipCommands;

const checkForDb =
/*#__PURE__*/
function () {
  var _ref4 = _asyncToGenerator(function* ({
    dbFilePath,
    sshConn
  }) {
    let errorMessage; // Check the local database file has been uploaded

    yield sshConn.execCommand(`test -f ${dbFilePath} && echo "true" || echo "false"`).then(({
      stdout,
      stderr
    }) => {
      // If error running command
      if (stderr) return errorMessage = `There was an issue checking the presence of the remote db dump\n\n${stderr}`; // If db dump doesn't exist

      if (stdout && String(stdout).includes('false')) return errorMessage = `The remote db dump wasn't found`;
    });
    if (errorMessage) return new Error(errorMessage);
    return;
  });

  return function checkForDb(_x4) {
    return _ref4.apply(this, arguments);
  };
}();

exports.checkForDb = checkForDb;

const unzipDb =
/*#__PURE__*/
function () {
  var _ref5 = _asyncToGenerator(function* ({
    dbFilePath,
    sshConn
  }) {
    let errorMessage; // -d : decompress / -f : force overwrite any existing file

    yield sshConn.execCommand(`gzip -df '${dbFilePath}'`).then(({
      stdout,
      stderr
    }) => {
      // If error running command
      if (stderr) return errorMessage = `There was an issue checking the presence of the remote db dump\n\n${stderr}`; // If db dump doesn't exist

      if (stdout && String(stdout).includes('false')) return errorMessage = `The remote db dump wasn't found`;
    });
    if (errorMessage) return new Error(errorMessage);
    return;
  });

  return function unzipDb(_x5) {
    return _ref5.apply(this, arguments);
  };
}(); // Drop the tables in the remote database to prepare for import


exports.unzipDb = unzipDb;

const clearDb =
/*#__PURE__*/
function () {
  var _ref6 = _asyncToGenerator(function* ({
    remoteEnv,
    sshConn
  }) {
    let errorMessage;
    const connectSql = `mysql --host="${remoteEnv.DB_SERVER}" --user="${remoteEnv.DB_USER}" --port="${remoteEnv.DB_PORT}" --database="${remoteEnv.DB_DATABASE}" --password="${remoteEnv.DB_PASSWORD}"`;
    yield sshConn.execCommand(`${connectSql} -Nse 'show tables' ${remoteEnv.DB_DATABASE} | while read table; do ${connectSql} -e "SET FOREIGN_KEY_CHECKS = 0; truncate table $table; SET FOREIGN_KEY_CHECKS = 1;" ${remoteEnv.DB_DATABASE}; done`).then(({
      stdout,
      stderr
    }) => {
      const cleanMessage = message => String(message).replace( // Suppress this warning - it's not as bad as it sounds
      /mysql: \[Warning] Using a password on the command line interface can be insecure./g, '').trim();

      const cleanStderr = stderr ? cleanMessage(stderr) : false;
      if (cleanStderr) errorMessage = `There was an issue attempting to clear the remote database\n\n${cleanStderr}`;
    });
    if (errorMessage) return new Error(errorMessage);
    return;
  });

  return function clearDb(_x6) {
    return _ref6.apply(this, arguments);
  };
}();

exports.clearDb = clearDb;

const importDb =
/*#__PURE__*/
function () {
  var _ref7 = _asyncToGenerator(function* ({
    remoteEnv,
    dbFilePath,
    sshConn
  }) {
    let errorMessage; // Import the local database into the remote with mysql

    yield sshConn.execCommand(importDbQuery({
      host: remoteEnv.DB_SERVER,
      port: remoteEnv.DB_PORT,
      user: remoteEnv.DB_USER,
      password: remoteEnv.DB_PASSWORD,
      database: remoteEnv.DB_DATABASE,
      importFile: dbFilePath
    })).then(({
      stdout,
      stderr
    }) => {
      const cleanMessage = message => String(message).replace( // Suppress this warning - it's not as bad as it sounds
      /mysql: \[Warning] Using a password on the command line interface can be insecure./g, '').trim();

      const cleanStderr = stderr ? cleanMessage(stderr) : false;
      if (cleanStderr) errorMessage = `There was an issue importing the local db dump on the remote server\n\n${cleanStderr}`;
    });
    if (errorMessage) return new Error(errorMessage);
    return;
  });

  return function importDb(_x7) {
    return _ref7.apply(this, arguments);
  };
}(); // Cleanup the database dump file on the remote


exports.importDb = importDb;

const removeDb =
/*#__PURE__*/
function () {
  var _ref8 = _asyncToGenerator(function* ({
    dbFilePath,
    sshConn
  }) {
    let errorMessage; // Import the local database into the remote with mysql

    yield sshConn.execCommand(`rm ${dbFilePath}`).then(({
      stdout,
      stderr
    }) => {
      // If error running command
      if (stderr) errorMessage = `There was an issue importing the local db dump on the remote server\n\n${stderr}`;
    });
    if (errorMessage) return new Error(errorMessage);
    return;
  });

  return function removeDb(_x8) {
    return _ref8.apply(this, arguments);
  };
}();

exports.removeDb = removeDb;