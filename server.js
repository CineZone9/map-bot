const express = require('express');
const http = require('http');
const path = require('path');

const { startBot } = require('./server/bot');
const { initWebSocket } = require('./server/websocket');
const { loadChunks } = require('./server/storage');

const config = require('./config/config.json');

const app = express();
const server = http.createServer(app);

app.use(express.static(path.join(__dirname, 'web')));

// API: visited chunks
app.get('/api/chunks', (req, res) => {
  res.json(loadChunks());
});

// API: config (radius, step, start)
app.get('/api/config', (req, res) => {
  res.json(config);
});

server.listen(config.web.port, () => {
  console.log('Web läuft auf http://localhost:' + config.web.port);
});

initWebSocket(server);
startBot();
