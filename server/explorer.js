const config = require("../config/config.json");
const { goals, Movements } = require("mineflayer-pathfinder");

const { sendLog, sendPosition } = require("./websocket");
const { saveProgress, loadProgress, saveChunk } = require("./storage");

let running = false;

async function startExploration(bot) {
  if (running) return;
  running = true;

  const mcData = require("minecraft-data")(bot.version);

  const defaultMove = new Movements(bot, mcData);

  defaultMove.allowParkour = false;
  defaultMove.canDig = false;

  bot.pathfinder.setMovements(defaultMove);

  const progress = loadProgress();

  const radius = config.exploration.radius;
  const step = config.exploration.step;

  const startX = progress.x ?? config.exploration.startX;
  const startZ = progress.z ?? config.exploration.startZ;

  sendLog("Pathfinder Exploration gestartet");

  let direction = 1;

  for (let x = startX - radius; x <= startX + radius; x += step) {

    if (direction === 1) {

      for (let z = startZ - radius; z <= startZ + radius; z += step) {
        await visit(bot, x, z);
      }

    } else {

      for (let z = startZ + radius; z >= startZ - radius; z -= step) {
        await visit(bot, x, z);
      }

    }

    direction *= -1;
  }

  running = false;
  sendLog("Exploration abgeschlossen");
}

async function visit(bot, x, z) {

  const goal = new goals.GoalXZ(x, z);

  sendLog(`Navigiere zu ${x} ${z}`);

  await bot.pathfinder.goto(goal);

  const chunkX = Math.floor(x / 16);
  const chunkZ = Math.floor(z / 16);

  saveChunk({
    x: chunkX,
    z: chunkZ,
    time: Date.now()
  });

  saveProgress({ x, z });

  sendPosition({
    x,
    z,
    chunkX,
    chunkZ
  });

  sendLog(`Chunk besucht ${chunkX} ${chunkZ}`);
}

module.exports = {
  startExploration
};
