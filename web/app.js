const ws = new WebSocket('ws://' + location.host);

// --- State ---
let chunks = [];
let currentPos = null;
let config = { exploration: { radius: 200, step: 16, startX: 0, startZ: 0 } };
let totalSteps = 0;

// --- DOM refs ---
const logsEl = document.getElementById('logs');
const posDisplay = document.getElementById('pos-display');
const chunkCount = document.getElementById('chunk-count');
const progressPct = document.getElementById('progress-pct');
const progressBar = document.getElementById('progress-bar');
const radiusDisplay = document.getElementById('radius-display');
const connBadge = document.getElementById('conn-badge');
const canvas = document.getElementById('map-canvas');
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('map-tooltip');

// --- Load initial data from server ---
async function loadInitial() {
  try {
    const [chunksRes, configRes] = await Promise.all([
      fetch('/api/chunks'),
      fetch('/api/config')
    ]);
    if (chunksRes.ok) chunks = await chunksRes.json();
    if (configRes.ok) config = await configRes.json();

    const r = config.exploration.radius;
    const s = config.exploration.step;
    totalSteps = Math.ceil((2 * r) / s + 1) ** 2;
    radiusDisplay.textContent = `±${r} Blöcke`;
    drawMap();
    updateProgress();
  } catch (e) {
    addLog('[INFO] API nicht erreichbar – warte auf WebSocket-Daten');
  }
}

// --- WebSocket ---
ws.onopen = () => {
  connBadge.textContent = 'Online';
  connBadge.className = 'badge connected';
};
ws.onclose = () => {
  connBadge.textContent = 'Offline';
  connBadge.className = 'badge disconnected';
};

ws.onmessage = (msg) => {
  const data = JSON.parse(msg.data);

  if (data.type === 'log') {
    addLog(data.msg);
  }
  if (data.type === 'status') {
    connBadge.textContent = data.status.connected ? 'Online' : 'Offline';
    connBadge.className = 'badge ' + (data.status.connected ? 'connected' : 'disconnected');
  }
  if (data.type === 'position') {
    currentPos = data.pos;
    posDisplay.textContent = `X ${data.pos.x}  /  Z ${data.pos.z}`;
  }
  if (data.type === 'chunk') {
    chunks.push(data.chunk);
    updateProgress();
    drawMap();
  }
};

// --- Log ---
function addLog(msg) {
  const d = document.createElement('div');
  d.className = 'log-line';
  const t = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  d.innerHTML = `<span class="log-time">${t}</span> ${escHtml(msg)}`;
  logsEl.prepend(d);
  if (logsEl.children.length > 200) logsEl.lastChild.remove();
}
function escHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

document.getElementById('btn-clear-log').onclick = () => logsEl.innerHTML = '';

// --- Progress ---
function updateProgress() {
  const n = chunks.length;
  chunkCount.textContent = n;
  const pct = totalSteps > 0 ? Math.min(100, Math.round((n / totalSteps) * 100)) : 0;
  progressPct.textContent = pct + '%';
  progressBar.style.width = pct + '%';
  progressBar.style.background = pct === 100
    ? 'var(--green)'
    : `linear-gradient(90deg, var(--accent) 0%, var(--green) ${pct}%)`;
}

// --- Map drawing ---
const CELL = 4; // px per chunk

function chunkBounds() {
  const r = config.exploration.radius;
  const s = config.exploration.step;
  const cx = config.exploration.startX;
  const cz = config.exploration.startZ;
  const minCX = Math.floor((cx - r) / 16);
  const maxCX = Math.floor((cx + r) / 16);
  const minCZ = Math.floor((cz - r) / 16);
  const maxCZ = Math.floor((cz + r) / 16);
  return { minCX, maxCX, minCZ, maxCZ };
}

function drawMap() {
  const { minCX, maxCX, minCZ, maxCZ } = chunkBounds();
  const cols = maxCX - minCX + 1;
  const rows = maxCZ - minCZ + 1;

  const W = cols * CELL;
  const H = rows * CELL;
  canvas.width = W;
  canvas.height = H;

  // Background
  ctx.fillStyle = '#0e1117';
  ctx.fillRect(0, 0, W, H);

  // Grid lines every 8 chunks
  ctx.strokeStyle = '#1e2a1e';
  ctx.lineWidth = 0.5;
  for (let c = 0; c <= cols; c += 8) {
    ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, H); ctx.stroke();
  }
  for (let r = 0; r <= rows; r += 8) {
    ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(W, r * CELL); ctx.stroke();
  }

  // Visited chunks
  const visited = new Set(chunks.map(c => `${c.x},${c.z}`));
  for (const c of chunks) {
    const cx = (c.x - minCX) * CELL;
    const cz = (c.z - minCZ) * CELL;
    const age = Date.now() - (c.time || Date.now());
    const alpha = Math.max(0.4, 1 - age / (1000 * 60 * 30)); // fade old chunks
    ctx.fillStyle = `rgba(0, 200, 100, ${alpha})`;
    ctx.fillRect(cx, cz, CELL - 1, CELL - 1);
  }

  // Origin crosshair
  const ox = (0 - minCX) * CELL;
  const oz = (0 - minCZ) * CELL;
  ctx.strokeStyle = '#ffffff33';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(ox, 0); ctx.lineTo(ox, H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, oz); ctx.lineTo(W, oz); ctx.stroke();

  // Current bot position
  if (currentPos) {
    const bx = (Math.floor(currentPos.x / 16) - minCX) * CELL;
    const bz = (Math.floor(currentPos.z / 16) - minCZ) * CELL;
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.arc(bx + CELL / 2, bz + CELL / 2, CELL, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Canvas hover tooltip
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const { minCX, minCZ } = chunkBounds();
  const cx = Math.floor(mx / CELL) + minCX;
  const cz = Math.floor(my / CELL) + minCZ;
  const found = chunks.find(c => c.x === cx && c.z === cz);
  if (found) {
    const t = found.time ? new Date(found.time).toLocaleTimeString('de-DE') : '?';
    tooltip.textContent = `Chunk ${cx} / ${cz}  •  ${t}`;
    tooltip.style.left = (e.offsetX + 12) + 'px';
    tooltip.style.top = (e.offsetY + 12) + 'px';
    tooltip.classList.remove('hidden');
  } else {
    tooltip.classList.add('hidden');
  }
});
canvas.addEventListener('mouseleave', () => tooltip.classList.add('hidden'));

// --- Download PNG ---
document.getElementById('btn-png').onclick = () => {
  drawMap();
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = `mc-map-${Date.now()}.png`;
  a.click();
};

// --- Download World JSON ---
document.getElementById('btn-world').onclick = async () => {
  try {
    const res = await fetch('/api/chunks');
    const data = res.ok ? await res.json() : chunks;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mc-world-chunks-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (e) {
    alert('Fehler beim Downloaden: ' + e.message);
  }
};

// --- Init ---
loadInitial();
