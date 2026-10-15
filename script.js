const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6],            // diagonals
];

const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const modeEl = document.getElementById('mode');
const scoreEls = {
  X: document.getElementById('score-x'),
  O: document.getElementById('score-o'),
  draw: document.getElementById('score-draw'),
};

let board, current, gameOver, starter = 'X';
let aiTimer = null;
const scores = { X: 0, O: 0, draw: 0 };

// Build the 9 cells once.
const cells = Array.from({ length: 9 }, (_, i) => {
  const btn = document.createElement('button');
  btn.className = 'cell';
  btn.setAttribute('aria-label', `Cell ${i + 1}, empty`);
  btn.addEventListener('click', () => handleMove(i));
  boardEl.appendChild(btn);
  return btn;
});

function getWinner(b) {
  for (const line of LINES) {
    const [a, c, d] = line;
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return { player: b[a], line };
  }
  return b.every(Boolean) ? { player: 'draw' } : null;
}

function isVsComputer() {
  return modeEl.value !== 'pvp';
}

function render() {
  board.forEach((val, i) => {
    const cell = cells[i];
    cell.className = 'cell' + (val ? ' ' + val.toLowerCase() : '');
    cell.innerHTML = val ? `<span>${val}</span>` : '';
    cell.disabled = gameOver || !!val;
    cell.setAttribute('aria-label', `Cell ${i + 1}, ${val || 'empty'}`);
  });
}

function setStatus() {
  const result = getWinner(board);
  if (result?.player === 'draw') {
    statusEl.textContent = "It's a draw!";
  } else if (result) {
    const who = isVsComputer() ? (result.player === 'X' ? 'You win!' : 'Computer wins!') : `Player ${result.player} wins!`;
    statusEl.textContent = who;
    result.line.forEach(i => cells[i].classList.add('win'));
  } else if (isVsComputer()) {
    statusEl.textContent = current === 'X' ? 'Your turn (X)' : 'Computer is thinking…';
  } else {
    statusEl.textContent = `Player ${current}'s turn`;
  }
}

function handleMove(i, byComputer = false) {
  if (gameOver || board[i]) return;
  if (!byComputer && isVsComputer() && current === 'O') return;

  board[i] = current;
  const result = getWinner(board);
  if (result) {
    gameOver = true;
    scores[result.player]++;
    updateScores();
  } else {
    current = current === 'X' ? 'O' : 'X';
  }
  render();
  setStatus();

  if (!gameOver && isVsComputer() && current === 'O') {
    aiTimer = setTimeout(computerMove, 400);
  }
}

function computerMove() {
  if (gameOver) return;
  const empty = board.map((v, i) => (v ? null : i)).filter(i => i !== null);
  let move;
  if (modeEl.value === 'easy' && Math.random() < 0.6) {
    move = empty[Math.floor(Math.random() * empty.length)];
  } else {
    move = bestMove(board, 'O');
  }
  handleMove(move, true);
}

// Minimax: returns the index of the best move for `player`.
function bestMove(b, player) {
  let best = { score: -Infinity, index: null };
  b.forEach((v, i) => {
    if (v) return;
    b[i] = player;
    const score = minimax(b, 0, false, player);
    b[i] = null;
    if (score > best.score) best = { score, index: i };
  });
  return best.index;
}

function minimax(b, depth, maximizing, me) {
  const result = getWinner(b);
  const opp = me === 'X' ? 'O' : 'X';
  if (result) {
    if (result.player === 'draw') return 0;
    return result.player === me ? 10 - depth : depth - 10;
  }
  let best = maximizing ? -Infinity : Infinity;
  b.forEach((v, i) => {
    if (v) return;
    b[i] = maximizing ? me : opp;
    const score = minimax(b, depth + 1, !maximizing, me);
    b[i] = null;
    best = maximizing ? Math.max(best, score) : Math.min(best, score);
  });
  return best;
}

function updateScores() {
  scoreEls.X.textContent = scores.X;
  scoreEls.O.textContent = scores.O;
  scoreEls.draw.textContent = scores.draw;
}

function newRound() {
  clearTimeout(aiTimer);
  board = Array(9).fill(null);
  current = starter;
  starter = starter === 'X' ? 'O' : 'X'; // alternate who starts each round
  gameOver = false;
  render();
  setStatus();
  if (isVsComputer() && current === 'O') aiTimer = setTimeout(computerMove, 400);
}

document.getElementById('restart').addEventListener('click', newRound);
document.getElementById('reset-scores').addEventListener('click', () => {
  scores.X = scores.O = scores.draw = 0;
  updateScores();
  starter = 'X';
  newRound();
});
modeEl.addEventListener('change', () => {
  starter = 'X';
  newRound();
});

newRound();
