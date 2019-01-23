"use strict";

var _path = _interopRequireDefault(require("path"));

var _utils = require("./utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const configFileName = 'swiff.config.js';
module.exports = {
  configFileName,
  pathApp: (0, _utils.resolveApp)(''),
  pathConfig: (0, _utils.resolveApp)(configFileName),
  pathLocalEnv: (0, _utils.resolveApp)('.env'),
  pathConfigTemplate: _path.default.resolve(__dirname, `../resources/${configFileName}`),
  pathLocalEnvTemplate: _path.default.resolve(__dirname, '../resources/.env'),
  pathBackups: _path.default.resolve(__dirname, '../backups'),
  pathMedia: _path.default.resolve(__dirname, '../resources')
};