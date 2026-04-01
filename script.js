const WIN_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6],             // diagonals
];

const cells    = document.querySelectorAll('.cell');
const statusEl = document.getElementById('status');
const resetBtn = document.getElementById('reset-btn');
const scoreX   = document.getElementById('score-x');
const scoreO   = document.getElementById('score-o');
const scoreDraw= document.getElementById('score-draw');

let board        = Array(9).fill(null);
let currentPlayer= 'X';
let gameOver     = false;
const scores     = { X: 0, O: 0, draw: 0 };

function setStatus(text, type = '') {
  statusEl.textContent = text;
  statusEl.className   = 'status ' + type;
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

function handleClick(e) {
  const idx = Number(e.target.dataset.index);
  if (gameOver || board[idx]) return;

  board[idx] = currentPlayer;
  e.target.textContent = currentPlayer;
  e.target.classList.add(currentPlayer.toLowerCase(), 'taken', 'pop');

  const result = checkWinner();

  if (result) {
    gameOver = true;
    if (result.winner) {
      result.combo.forEach(i => cells[i].classList.add('win-cell'));
      scores[result.winner]++;
      updateScoreDisplay();
      setStatus(`Player ${result.winner} wins!`, 'win');
    } else {
      scores.draw++;
      updateScoreDisplay();
      setStatus("It's a draw!", 'draw');
    }
    return;
  }

  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  setStatus(`Player ${currentPlayer}'s turn`);
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

  setStatus("Player X's turn");
}

cells.forEach(cell => cell.addEventListener('click', handleClick));
resetBtn.addEventListener('click', resetGame);
