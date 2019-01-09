"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "promisify", {
  enumerable: true,
  get: function () {
    return _util.promisify;
  }
});
Object.defineProperty(exports, "isEmpty", {
  enumerable: true,
  get: function () {
    return _lodash.isEmpty;
  }
});
exports.replaceRsyncOutput = exports.commaAmpersander = exports.doesFileExist = exports.cmdPromise = exports.getMissingPaths = exports.executeCommands = exports.resolveApp = void 0;

var _path = _interopRequireDefault(require("path"));

var _util = require("util");

var _lodash = require("lodash");

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _child_process = require("child_process");

var _nodeCmd = _interopRequireDefault(require("node-cmd"));

var _palette = require("./palette");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

const execPromise = (0, _util.promisify)(_child_process.exec);
const cmdPromise = (0, _util.promisify)(_nodeCmd.default.get); // Make sure any symlinks in the project folder are resolved

exports.cmdPromise = cmdPromise;

const appDirectory = _fsExtra.default.realpathSync(process.cwd());

const resolveApp = relativePath => _path.default.resolve(appDirectory, relativePath); // Execute bash commands


exports.resolveApp = resolveApp;

const executeCommands =
/*#__PURE__*/
function () {
  var _ref = _asyncToGenerator(function* (commands) {
    try {
      const {
        stdout
      } = yield execPromise(commands);
      return stdout;
    } catch (error) {
      return new Error(error);
    }
  });

  return function executeCommands(_x) {
    return _ref.apply(this, arguments);
  };
}();

exports.executeCommands = executeCommands;

const doesFileExist =
/*#__PURE__*/
function () {
  var _ref2 = _asyncToGenerator(function* (file) {
    return _fsExtra.default.pathExists(file);
  });

  return function doesFileExist(_x2) {
    return _ref2.apply(this, arguments);
  };
}(); // Returns a list of missing paths


exports.doesFileExist = doesFileExist;

const getMissingPaths =
/*#__PURE__*/
function () {
  var _ref3 = _asyncToGenerator(function* (suppliedPaths, configSetting) {
    // Map over the list of paths and return missing ones
    const getResults =
    /*#__PURE__*/
    function () {
      var _ref4 = _asyncToGenerator(function* (paths) {
        const pathChecks = yield paths.map(
        /*#__PURE__*/
        function () {
          var _ref5 = _asyncToGenerator(function* (path) {
            const doesExist = yield doesFileExist(path);
            return doesExist ? null : path;
          });

          return function (_x6) {
            return _ref5.apply(this, arguments);
          };
        }());
        return Promise.all(pathChecks);
      });

      return function getResults(_x5) {
        return _ref4.apply(this, arguments);
      };
    }(); // Wait for the path results


    const results = yield getResults(suppliedPaths); // Remove the nulls from the object

    const filteredResults = results.filter(i => i); // Create a template helper for wording adjustments

    const hasMultipleResults = filteredResults.length > 1; // Return the missing path messages

    return !(0, _lodash.isEmpty)(filteredResults) ? new Error(`The folder${hasMultipleResults ? 's' : ''} ${commaAmpersander(filteredResults, _palette.colourAttention)} ${hasMultipleResults ? 'aren’t found in' : 'isn’t found in'} your project\n\nEither create ${hasMultipleResults ? 'those folders' : 'the folder'} or adjust the ${(0, _palette.colourAttention)(configSetting)} values in your ${(0, _palette.colourAttention)('swiff.config.js')}`) : [];
  });

  return function getMissingPaths(_x3, _x4) {
    return _ref3.apply(this, arguments);
  };
}();

exports.getMissingPaths = getMissingPaths;

const commaAmpersander = (array, styler = _palette.colourHighlight) => array.map((f, i) => (i > 0 ? i === array.length - 1 ? ' and ' : ', ' : '') + styler(f)).join(''); // Check https://stackoverflow.com/a/36851784/9055509 for rsync output details


exports.commaAmpersander = commaAmpersander;

const replaceRsyncOutput = (outputText, folders) => // If no changes then don't render anything
outputText.split('\n').filter(Boolean).length === folders.length ? '' : outputText.split('\n') // Remove empty items
.filter(Boolean) // Add note to folders with now changes
.map((e, i, arr) => {
  // (i !== arr.length)
  const isLast = i === arr.length - 1;
  const isNextAFolder = !isLast && arr[i + 1].startsWith('!');
  return e.startsWith('!') && (isNextAFolder || isLast) ? '' : e;
}).map(i => i.startsWith('!') ? `\n${i.substring(1)}` : i) // Remove 'modified date updated'
.filter(i => !i.startsWith('<f..t')).map(i => `${i.replace(/\<f\+\+\+\+\+\+\+/g, (0, _palette.colourHighlight)('+')) // Added
.replace(/\*deleting/g, (0, _palette.colourAttention)('-')) // Deleted
.replace(/\<f.st..../g, (0, _palette.colourHighlight)('^')) // Updated
}`) // Remove empty items
.filter(Boolean).join('\n');

exports.replaceRsyncOutput = replaceRsyncOutput;