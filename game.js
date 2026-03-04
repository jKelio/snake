'use strict';

// ── Constants ─────────────────────────────────────────────

const COLS       = 18;
const ROWS       = 18;
const CELL       = 10;
const BASE_SPEED = 200;   // ms per tick at score 0
const MIN_SPEED  = 60;    // ms per tick at max speed
const SPEED_STEP = 10;    // ms reduction per food eaten

const COLOR_BG    = '#8fa878';
const COLOR_DARK  = '#3a4a2a';
const COLOR_SNAKE = '#2a3a1a';
const COLOR_HEAD  = '#1a2a10';
const COLOR_FOOD  = '#1a2a10';
const COLOR_GRID  = '#86a070';

// ── DOM References ────────────────────────────────────────

const canvas   = document.getElementById('gameCanvas');
const ctx      = canvas.getContext('2d');
const scoreEl  = document.getElementById('score');
const overlay  = document.getElementById('overlay');
const oTitle   = document.getElementById('overlay-title');
const oSub     = document.getElementById('overlay-sub');
const oScore   = document.getElementById('overlay-score');

// ── State ─────────────────────────────────────────────────

const state = {
  phase:         'idle',
  snake:         [],
  direction:     { x: 1, y: 0 },
  nextDirection: { x: 1, y: 0 },
  food:          { x: 0, y: 0 },
  score:         0,
  tickInterval:  null,
  foodVisible:   true,
};

// ── Game Lifecycle ────────────────────────────────────────

function startGame() {
  hideOverlay();
  initState();
  clearInterval(state.tickInterval);
  state.tickInterval = setInterval(tick, BASE_SPEED);
}

function initState() {
  const midX = Math.floor(COLS / 2);
  const midY = Math.floor(ROWS / 2);

  state.phase         = 'playing';
  state.direction     = { x: 1, y: 0 };
  state.nextDirection = { x: 1, y: 0 };
  state.score         = 0;
  state.foodVisible   = true;
  state.snake         = [
    { x: midX,     y: midY },
    { x: midX - 1, y: midY },
    { x: midX - 2, y: midY },
  ];

  placeFood();
  scoreEl.textContent = '0';
}

function tick() {
  state.direction = { ...state.nextDirection };

  const newHead = {
    x: state.snake[0].x + state.direction.x,
    y: state.snake[0].y + state.direction.y,
  };

  if (isWallCollision(newHead) || isSelfCollision(newHead)) {
    return handleGameOver();
  }

  const ateFood = newHead.x === state.food.x && newHead.y === state.food.y;

  state.snake.unshift(newHead);

  if (ateFood) {
    state.score++;
    scoreEl.textContent = state.score;
    placeFood();
    adjustSpeed();
  } else {
    state.snake.pop();
  }

  state.foodVisible = !state.foodVisible;
  render();
}

function handleGameOver() {
  state.phase = 'dead';
  clearInterval(state.tickInterval);
  flashDeath(() => showOverlay('GAME OVER', 'Press ENTER to Retry', `SCORE: ${state.score}`));
}

// ── Collision Detection ───────────────────────────────────

function isWallCollision({ x, y }) {
  return x < 0 || x >= COLS || y < 0 || y >= ROWS;
}

function isSelfCollision(head) {
  // Exclude the tail: it vacates its cell this tick (unless we ate food, but
  // food is checked before removing the tail, so this is always safe)
  return state.snake.slice(0, -1).some(seg => seg.x === head.x && seg.y === head.y);
}

// ── Food ──────────────────────────────────────────────────

function placeFood() {
  const occupied = new Set(state.snake.map(({ x, y }) => `${x},${y}`));
  let pos;
  do {
    pos = { x: randomInt(COLS), y: randomInt(ROWS) };
  } while (occupied.has(`${pos.x},${pos.y}`));
  state.food = pos;
}

// ── Speed ─────────────────────────────────────────────────

function adjustSpeed() {
  const speed = Math.max(MIN_SPEED, BASE_SPEED - state.score * SPEED_STEP);
  clearInterval(state.tickInterval);
  state.tickInterval = setInterval(tick, speed);
}

// ── Rendering ─────────────────────────────────────────────

function render() {
  drawBackground();
  if (state.foodVisible) drawFood();
  drawSnake();
}

function drawBackground() {
  ctx.fillStyle = COLOR_BG;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = COLOR_GRID;
  for (let x = 0; x < COLS; x++) {
    for (let y = 0; y < ROWS; y++) {
      ctx.fillRect(x * CELL + 4, y * CELL + 4, 1, 1);
    }
  }
}

function drawFood() {
  ctx.strokeStyle = COLOR_FOOD;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(
    state.food.x * CELL + 2.5,
    state.food.y * CELL + 2.5,
    CELL - 5,
    CELL - 5,
  );
}

function drawSnake() {
  ctx.fillStyle = COLOR_SNAKE;
  for (let i = 1; i < state.snake.length; i++) {
    drawCell(state.snake[i]);
  }

  ctx.fillStyle = COLOR_HEAD;
  drawCell(state.snake[0]);
}

function drawCell({ x, y }) {
  ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
}

// ── Death Animation ───────────────────────────────────────

function flashDeath(callback) {
  let flashes = 0;
  const interval = setInterval(() => {
    const isLight = flashes % 2 === 0;
    ctx.fillStyle = isLight ? '#556644' : COLOR_BG;
    state.snake.forEach(seg => drawCell(seg));
    flashes++;
    if (flashes >= 6) {
      clearInterval(interval);
      callback();
    }
  }, 80);
}

// ── Overlay ───────────────────────────────────────────────

function showOverlay(title, sub, score = '') {
  oTitle.textContent = title;
  oSub.textContent   = sub;
  oScore.textContent = score;
  overlay.style.display = 'flex';
}

function hideOverlay() {
  overlay.style.display = 'none';
}

// ── Input ─────────────────────────────────────────────────

const KEY_DIRS = {
  ArrowUp:    { x:  0, y: -1 },
  ArrowDown:  { x:  0, y:  1 },
  ArrowLeft:  { x: -1, y:  0 },
  ArrowRight: { x:  1, y:  0 },
};

document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    if (state.phase !== 'playing') startGame();
    return;
  }

  const dir = KEY_DIRS[e.key];
  if (!dir) return;

  e.preventDefault();

  const isReversal = dir.x === -state.direction.x && dir.y === -state.direction.y;
  if (!isReversal) state.nextDirection = dir;
});

document.querySelectorAll('.dpad-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const map = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
    document.dispatchEvent(new KeyboardEvent('keydown', { key: map[btn.dataset.dir] }));
  });
});

// ── Helpers ───────────────────────────────────────────────

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

// ── Init ──────────────────────────────────────────────────

showOverlay('SNAKE', 'Press ENTER to Start');
render();
