"use strict";Object.defineProperty(exports,"__esModule",{value:!0});const colors_1=require("colors");var MessageType;!function(e){e[e.INFO=1]="INFO",e[e.WARNING=2]="WARNING",e[e.ERROR=3]="ERROR",e[e.SUCCESS=4]="SUCCESS",e[e.FATAL=5]="FATAL"}(MessageType=exports.MessageType||(exports.MessageType={}));class OEUtils{static consoleLogMessage(e,s){let o;switch(s){default:case MessageType.INFO:o=colors_1.gray(`[OE TEST AGENT] ${e}.`);break;case MessageType.WARNING:o=colors_1.yellow(`[OE TEST AGENT] ${e}.`);break;case MessageType.ERROR:o=colors_1.red(`[OE TEST AGENT] ${e}.`);break;case MessageType.SUCCESS:o=colors_1.green(`[OE TEST AGENT] ${e}.`);break;case MessageType.FATAL:o=colors_1.bgRed(`[OE TEST AGENT] ${e}.`)}console.log(o)}}exports.OEUtils=OEUtils;