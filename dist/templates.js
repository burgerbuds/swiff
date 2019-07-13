"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MessageTemplate = exports.OptionsTemplate = void 0;

var _react = _interopRequireDefault(require("react"));

var _ink = require("ink");

var _inkSelectInput = _interopRequireDefault(require("ink-select-input"));

var _inkSpinner = _interopRequireDefault(require("ink-spinner"));

var _utils = require("./utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const OptionsTemplate = ({
  selectProps
}) => _react.default.createElement(_inkSelectInput.default, selectProps);

exports.OptionsTemplate = OptionsTemplate;

const MessageTemplate = ({
  messages,
  isFlaggedStart
}) => _react.default.createElement(_ink.Box, {
  flexDirection: "column"
}, !(0, _utils.isEmpty)(messages) && messages.map(({
  text,
  type
}, i) => _react.default.createElement(_ink.Box, {
  key: `msg${i}`
}, type === 'heading' && !isFlaggedStart && _react.default.createElement(_ink.Box, {
  marginBottom: 1
}, _react.default.createElement(_ink.Text, {
  bold: true
}, `—— ${text} ——`)), type === 'heading' && isFlaggedStart && _react.default.createElement(_ink.Text, {
  bold: true
}, `${text}\n`), _react.default.createElement(_ink.Color, {
  dim: messages.length - 1 !== i
}, type === 'error' && `💩  ${text}`, type === 'success' && `👌  ${text}`, type === 'message' && `💁‍  ${text}`, type === 'working' && (messages.length - 1 === i ? _react.default.createElement(_inkSpinner.default, {
  type: "runner"
}) : `🏃 `), type === 'working' && ` ${text}`))));

exports.MessageTemplate = MessageTemplate;