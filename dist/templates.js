"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MessageTemplate = exports.OptionsTemplate = void 0;

var _ink = require("ink");

var _inkSelectInput = _interopRequireDefault(require("ink-select-input"));

var _inkSpinner = _interopRequireDefault(require("ink-spinner"));

var _utils = require("./utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const OptionsTemplate = ({
  selectProps
}) => (0, _ink.h)(_inkSelectInput.default, selectProps);

exports.OptionsTemplate = OptionsTemplate;

const MessageTemplate = ({
  messages,
  isFlaggedStart
}) => (0, _ink.h)(_ink.Text, null, !(0, _utils.isEmpty)(messages) && messages.map(({
  text,
  type
}, i) => (0, _ink.h)(_ink.Text, null, type === 'heading' && !isFlaggedStart && (0, _ink.h)(_ink.Text, {
  bold: true
}, `—— ${text} ——\n`), type === 'heading' && isFlaggedStart && (0, _ink.h)(_ink.Text, {
  bold: true
}, `${text}\n`), (0, _ink.h)(_ink.Text, {
  dim: messages.length - 1 !== i
}, type === 'error' && `💩  ${text}`, type === 'success' && `👌  ${text}`, type === 'message' && `💁‍  ${text}`, type === 'working' && (messages.length - 1 === i ? (0, _ink.h)(_inkSpinner.default, {
  type: "runner"
}) : `🏃 `), type === 'working' && ` ${text}`, (0, _ink.h)("br", null)))));

exports.MessageTemplate = MessageTemplate;