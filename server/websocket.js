const WebSocket = require('ws');

let wss;

function initWebSocket(server) {
  wss = new WebSocket.Server({ server });

  wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'init' }));
  });
}

function broadcast(data) {
  if (!wss) return;
  wss.clients.forEach(c => {
    if (c.readyState === 1) c.send(JSON.stringify(data));
  });
}

function sendLog(msg) {
  broadcast({ type: 'log', msg });
}

function sendStatus(status) {
  broadcast({ type: 'status', status });
}

function sendPosition(pos) {
  broadcast({ type: 'position', pos });
}

module.exports = { initWebSocket, sendLog, sendStatus, sendPosition };
