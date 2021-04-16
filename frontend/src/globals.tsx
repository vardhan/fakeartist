var WebSocketClient = require('rpc-websockets').Client
export const gWebsockClient = new WebSocketClient('ws://localhost:1234/ws');
export const kMinPlayers = 1;