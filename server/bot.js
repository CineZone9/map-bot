const mineflayer = require('mineflayer');
const config = require('../config/config.json');
const { startExploration } = require('./explorer');
const { sendLog, sendStatus } = require('./websocket');
const { pathfinder } = require("mineflayer-pathfinder");

let bot;

function startBot() {
  bot = mineflayer.createBot({
    host: config.server.host,
    port: config.server.port,
    username: config.server.username
  });
      bot.loadPlugin(pathfinder);

  bot.on('login', () => {
    sendLog('Bot eingeloggt');
    sendStatus({ connected: true });
    startExploration(bot);
  });

  bot.on('end', () => {
    sendLog('Verbindung verloren. Reconnect in 5s...');
    sendStatus({ connected: false });
    setTimeout(startBot, 5000);
  });

  bot.on('chat', (username, message) => {
    sendLog(`[CHAT] ${username}: ${message}`);
  });

  bot.on('error', (err) => {
    sendLog('[ERROR] ' + err.message);
  });
}

module.exports = { startBot, bot: () => bot };
