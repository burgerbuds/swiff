"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.doLocalDbDump = exports.doImportDb = exports.doDropAllDbTables = exports.getDbDumpZipCommands = void 0;

var _ink = require("ink");

var _promiseMysql = _interopRequireDefault(require("promise-mysql"));

var _utils = require("./utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

// Clear out the tables in a database
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
      database: null // Create the connection to the local database

    };
    const conn = yield _promiseMysql.default.createConnection(_objectSpread({}, defaultConfig, config)).catch(error => errorMessage = error);
    if (errorMessage) return new Error(errorMessage); // This query avoids drop errors when run multiple times.
    // A more solid solution than dropping and recreating the db.
    // https://stackoverflow.com/a/18625545

    conn.query(`SET FOREIGN_KEY_CHECKS = 0;
    SET GROUP_CONCAT_MAX_LEN=32768;
    SET @tables = NULL;
    SELECT GROUP_CONCAT('\`', table_name, '\`') INTO @tables
      FROM information_schema.tables
      WHERE table_schema = (SELECT DATABASE());
    SELECT IFNULL(@tables,'dummy') INTO @tables;
    SET @tables = CONCAT('DROP TABLE IF EXISTS ', @tables);
    PREPARE stmt FROM @tables;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
    SET FOREIGN_KEY_CHECKS = 1;`);
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
  var _ref2 = _asyncToGenerator(function* ({
    host = 'localhost',
    port = 3306,
    user,
    password,
    database,
    importFile
  }) {
    let errorMessage;
    yield (0, _utils.cmdPromise)(`mysql --host='${host}' --port='${!(0, _utils.isEmpty)(port) ? port : 3306}' --user='${user}' --password='${password}' ${database} < ${importFile};`).catch(e => errorMessage = e);
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
}) => // Dump and zip the remote db (can make it around 9 times smaller)
`mysqldump --host='${host}' --port='${port}' --user='${user}' --password='${password}' ${database} | gzip > '${gzipFilePath}'`;

exports.getDbDumpZipCommands = getDbDumpZipCommands;