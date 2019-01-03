"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.colourDefault = exports.colourMuted = exports.colourHighlight = exports.colourAttention = exports.hexMuted = exports.hexHighlight = exports.hexAttention = exports.colourNotice = void 0;

var _chalk = _interopRequireDefault(require("chalk"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const hexNotice = '#F7F05A';
const hexAttention = '#FC6C85';
exports.hexAttention = hexAttention;
const hexHighlight = '#6EFFBF';
exports.hexHighlight = hexHighlight;
const hexMuted = '#AAA';
exports.hexMuted = hexMuted;
const hexDefault = '#FFF';

const colourNotice = text => _chalk.default.hex(hexNotice).bold(text);

exports.colourNotice = colourNotice;

const colourAttention = text => _chalk.default.hex(hexAttention).bold(text);

exports.colourAttention = colourAttention;

const colourHighlight = text => _chalk.default.hex(hexHighlight).bold(text);

exports.colourHighlight = colourHighlight;

const colourMuted = text => _chalk.default.hex(hexMuted)(text);

exports.colourMuted = colourMuted;

const colourDefault = text => _chalk.default.hex(hexDefault)(text);

exports.colourDefault = colourDefault;