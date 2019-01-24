"use strict";var __importStar=this&&this.__importStar||function(e){if(e&&e.__esModule)return e;var t={};if(null!=e)for(var s in e)Object.hasOwnProperty.call(e,s)&&(t[s]=e[s]);return t.default=e,t};Object.defineProperty(exports,"__esModule",{value:!0});const net=__importStar(require("net")),OEUtils_1=require("./OEUtils");class OESocket{constructor(){this.isConnected=!1}connect(e,t){return new Promise((s,n)=>{this.client=new net.Socket;const o=()=>this.client.connect(t,e);o(),this.client.on("connect",()=>this.onConnect(s)),this.client.on("close",()=>this.onClose()),this.client.on("error",e=>this.onError(o,5,e,n))})}connected(){return this.isConnected}onConnect(e){this.isConnected=!0,e(!0)}onClose(){this.client.destroy(),this.isConnected=!1}onError(e,t,s,n){--t>0?setTimeout(e,1e3):(this.isConnected=!1,n(s))}onData(e){let t;const s=e.split("|"),n=s[0].toUpperCase(),o=s.length>1?s[1]:"";return"OK"===n?(OEUtils_1.OEUtils.consoleLogMessage(`Data received: "${e}"`,OEUtils_1.MessageType.SUCCESS),t=Promise.resolve(o)):(OEUtils_1.OEUtils.consoleLogMessage(`Data received: "${e}"`,OEUtils_1.MessageType.ERROR),t=Promise.reject(new Error(o))),t}send(e,...t){return new Promise((s,n)=>{const o=`${e}|${t.join("|")}`;OEUtils_1.OEUtils.consoleLogMessage(`Sending data: "${o}"`,OEUtils_1.MessageType.INFO),this.client.write(o),e?this.client.once("data",e=>this.onData(e.toString("utf-8")).then(s).catch(n)):s("OK")})}}exports.OESocket=OESocket;