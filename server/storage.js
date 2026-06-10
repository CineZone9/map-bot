const fs = require('fs');
const path = require('path');

const chunkFile = path.join(__dirname, '../data/chunks.json');
const progressFile = path.join(__dirname, '../data/progress.json');

function loadChunks() {
  try {
    return JSON.parse(fs.readFileSync(chunkFile));
  } catch {
    return [];
  }
}

function saveChunk(chunk) {
  const data = loadChunks();
  data.push(chunk);
  fs.writeFileSync(chunkFile, JSON.stringify(data, null, 2));
}

function saveProgress(p) {
  fs.writeFileSync(progressFile, JSON.stringify(p, null, 2));
}

function loadProgress() {
  try {
    return JSON.parse(fs.readFileSync(progressFile));
  } catch {
    return {};
  }
}

module.exports = { saveChunk, saveProgress, loadProgress };
