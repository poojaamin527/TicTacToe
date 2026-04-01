const WIN_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6],             // diagonals
];

const cells    = document.querySelectorAll('.cell');
const statusEl = document.getElementById('status');
const resetBtn = document.getElementById('reset-btn');
const muteBtn  = document.getElementById('mute-btn');
const scoreX   = document.getElementById('score-x');
const scoreO   = document.getElementById('score-o');
const scoreDraw= document.getElementById('score-draw');
const PLAYER_MARKS = { X: '🌮', O: '🍕' };

let audioCtx = null;
let musicInterval = null;
let musicStep = 0;
let audioStarted = false;
let isMuted = false;
let masterGain = null;
let musicGain = null;
let sfxGain = null;

let board        = Array(9).fill(null);
let currentPlayer= 'X';
let gameOver     = false;
const scores     = { X: 0, O: 0, draw: 0 };

function setStatus(text, type = '') {
  statusEl.textContent = text;
  statusEl.className   = 'status ' + type;
}

function getPlayerLabel(player) {
  return PLAYER_MARKS[player];
}

function checkWinner() {
  for (const [a, b, c] of WIN_COMBOS) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], combo: [a, b, c] };
    }
  }
  if (board.every(Boolean)) return { winner: null, combo: [] }; // draw
  return null;
}

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    musicGain = audioCtx.createGain();
    sfxGain = audioCtx.createGain();

    masterGain.gain.value = 1;
    musicGain.gain.value = 0.22; // upfront volume on page open
    sfxGain.gain.value = 1;

    musicGain.connect(masterGain);
    sfxGain.connect(masterGain);
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playTone(freq, duration = 0.12, type = 'triangle', volume = 0.06, delay = 0, bus = 'sfx') {
  if (!audioCtx || isMuted) return;
  const now = audioCtx.currentTime + delay;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(bus === 'music' ? musicGain : sfxGain);
  osc.start(now);
  osc.stop(now + duration + 0.01);
}

function startBackgroundMusic() {
  if (musicInterval) return;
  const melody = [
    { bass: 65.41, lead: 261.63, harmony: 329.63 }, // C2 / C4 / E4
    { bass: 65.41, lead: 293.66, harmony: 349.23 }, // D4 / F4
    { bass: 73.42, lead: 329.63, harmony: 392.0 },  // E4 / G4
    { bass: 65.41, lead: 293.66, harmony: 349.23 },
    { bass: 61.74, lead: 246.94, harmony: 329.63 }, // B3 / E4
    { bass: 58.27, lead: 220.0, harmony: 293.66 },  // A3 / D4
    { bass: 55.0,  lead: 207.65, harmony: 261.63 }, // G#3 / C4
    { bass: 58.27, lead: 220.0, harmony: 293.66 },
  ];
  musicInterval = setInterval(() => {
    const step = melody[musicStep % melody.length];
    // Dark, calming ambient melody with gentle bass and soft harmony.
    playTone(step.bass, 0.62, 'sine', 0.03, 0, 'music');
    playTone(step.lead, 0.5, 'triangle', 0.014, 0.05, 'music');
    playTone(step.harmony, 0.46, 'sine', 0.009, 0.1, 'music');
    musicStep++;
  }, 760);
}

function playMoveSound(player) {
  const base = player === 'X' ? 370 : 520;
  playTone(base, 0.08, 'square', 0.08);
}

function playWinSound() {
  const riff = [523.25, 659.25, 783.99, 1046.5];
  riff.forEach((note, i) => playTone(note, 0.16, 'triangle', 0.07, i * 0.1));
}

function playDrawSound() {
  playTone(330, 0.12, 'sawtooth', 0.04);
  playTone(294, 0.16, 'sawtooth', 0.04, 0.1);
}

function toggleMute() {
  isMuted = !isMuted;
  muteBtn.textContent = isMuted ? 'Unmute' : 'Mute';
  muteBtn.setAttribute('aria-pressed', String(isMuted));
}

function duckMusicForGameplay() {
  if (!audioCtx || !musicGain) return;
  const now = audioCtx.currentTime;
  musicGain.gain.cancelScheduledValues(now);
  musicGain.gain.setValueAtTime(musicGain.gain.value, now);
  musicGain.gain.linearRampToValueAtTime(0.07, now + 0.35);
}

function ensureAudioStarted() {
  if (!audioStarted) {
    initAudio();
    startBackgroundMusic();
    audioStarted = true;
  }
}

function handleClick(e) {
  ensureAudioStarted();
  duckMusicForGameplay();

  const idx = Number(e.target.dataset.index);
  if (gameOver || board[idx]) return;

  board[idx] = currentPlayer;
  e.target.textContent = PLAYER_MARKS[currentPlayer];
  e.target.classList.add(currentPlayer.toLowerCase(), 'taken', 'pop');
  playMoveSound(currentPlayer);

  const result = checkWinner();

  if (result) {
    gameOver = true;
    if (result.winner) {
      result.combo.forEach(i => cells[i].classList.add('win-cell'));
      scores[result.winner]++;
      updateScoreDisplay();
      setStatus(`Player ${getPlayerLabel(result.winner)} wins!`, 'win');
      playWinSound();
    } else {
      scores.draw++;
      updateScoreDisplay();
      setStatus("It's a draw!", 'draw');
      playDrawSound();
    }
    return;
  }

  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  setStatus(`Player ${getPlayerLabel(currentPlayer)}'s turn`);
}

function updateScoreDisplay() {
  scoreX.textContent    = scores.X;
  scoreO.textContent    = scores.O;
  scoreDraw.textContent = scores.draw;
}

function resetGame() {
  board         = Array(9).fill(null);
  currentPlayer = 'X';
  gameOver      = false;

  cells.forEach(cell => {
    cell.textContent = '';
    cell.className   = 'cell';
  });

  setStatus(`Player ${getPlayerLabel('X')}'s turn`);
}

cells.forEach(cell => cell.addEventListener('click', handleClick));
resetBtn.addEventListener('click', resetGame);
muteBtn.addEventListener('click', toggleMute);

// Try to start music on page open; browsers may still require interaction.
window.addEventListener('load', ensureAudioStarted);
window.addEventListener('pointerdown', ensureAudioStarted, { once: true });
