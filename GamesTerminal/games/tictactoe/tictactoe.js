(function () {
  'use strict';

  const LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6],            // diagonals
  ];

  const MODES = [
    { key: '1', id: 'hard', label: 'vs computer (unbeatable)' },
    { key: '2', id: 'easy', label: 'vs computer (easy)' },
    { key: '3', id: 'pvp', label: '2 players' },
  ];

  const ARROWS = { arrowup: -3, arrowdown: 3, arrowleft: -1, arrowright: 1 };

  function getWinner(b) {
    for (const line of LINES) {
      const [a, c, d] = line;
      if (b[a] && b[a] === b[c] && b[a] === b[d]) return { player: b[a], line };
    }
    return b.every(Boolean) ? { player: 'draw', line: [] } : null;
  }

  // Minimax: best cell for `me` on board `b`.
  function bestMove(b, me) {
    let best = { score: -Infinity, index: null };
    b.forEach((v, i) => {
      if (v) return;
      b[i] = me;
      const score = minimax(b, 0, false, me);
      b[i] = null;
      if (score > best.score) best = { score, index: i };
    });
    return best.index;
  }

  function minimax(b, depth, maximizing, me) {
    const result = getWinner(b);
    if (result) {
      if (result.player === 'draw') return 0;
      return result.player === me ? 10 - depth : depth - 10;
    }
    const opp = me === 'X' ? 'O' : 'X';
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

  Terminal.register({
    name: 'tic tac toe',
    aliases: ['tictactoe', 'ttt'],
    description: 'Play Tic Tac Toe against the computer or a friend',
    run(term) {
      term.launch(({ root, exit }) => {
        const score = { X: 0, O: 0, draw: 0 };
        let mode = null;
        let board, current, result;
        let starter = 'X';
        let cursor = 4;
        let showCursor = false;
        let aiTimer = null;
        let cells = [];
        let statusEl, scoreEl;

        root.classList.add('ttt');
        const body = term.div();
        root.append(term.div('app-title', 'TIC TAC TOE'), body);

        const vsComputer = () => mode && mode.id !== 'pvp';
        const computerTurn = () => vsComputer() && current === 'O' && !result;

        function showMenu() {
          body.replaceChildren(
            term.div('line', 'Choose a mode:'),
            ...MODES.map(m => {
              const row = term.div('menu-row');
              row.append(term.button(`[${m.key}] ${m.label}`, () => choose(m)));
              return row;
            }),
            term.div('line muted hint', 'Press 1-3 to choose, Q to quit'),
          );
        }

        function choose(m) {
          mode = m;
          starter = 'X';
          const grid = term.div('ttt-board');
          cells = Array.from({ length: 9 }, (_, i) => {
            const cell = term.button('', () => humanMove(i), 'ttt-cell');
            grid.append(cell);
            return cell;
          });
          statusEl = term.div('line ttt-status');
          scoreEl = term.div('line muted');
          const actions = term.div('app-actions');
          actions.append(term.button('[R] new round', newRound), term.button('[Q] quit', quit));
          body.replaceChildren(
            term.div('line muted', `Mode: ${m.label}`),
            statusEl, grid, scoreEl, actions,
            term.div('line muted hint', 'Keys: 1-9 or arrows + Enter to play'),
          );
          newRound();
        }

        function newRound() {
          if (!mode) return;
          clearTimeout(aiTimer);
          board = Array(9).fill(null);
          current = starter;
          starter = starter === 'X' ? 'O' : 'X'; // alternate who starts
          result = null;
          render();
          if (computerTurn()) aiTimer = setTimeout(computerMove, 400);
        }

        function humanMove(i) {
          if (result || board[i] || computerTurn()) return;
          place(i);
        }

        function computerMove() {
          const empty = board.flatMap((v, i) => (v ? [] : [i]));
          const move = mode.id === 'easy' && Math.random() < 0.6
            ? empty[Math.floor(Math.random() * empty.length)]
            : bestMove(board, 'O');
          place(move);
        }

        function place(i) {
          board[i] = current;
          result = getWinner(board);
          if (result) score[result.player]++;
          else current = current === 'X' ? 'O' : 'X';
          render();
          if (computerTurn()) aiTimer = setTimeout(computerMove, 400);
        }

        function status() {
          if (result && result.player === 'draw') return "It's a draw!  Press R for a new round.";
          if (result) {
            const who = vsComputer() ? (result.player === 'X' ? 'You win!' : 'Computer wins!') : `Player ${result.player} wins!`;
            return `${who}  Press R for a new round.`;
          }
          if (vsComputer()) return current === 'X' ? 'Your turn (X)' : 'Computer is thinking...';
          return `Player ${current}'s turn`;
        }

        function render() {
          cells.forEach((cell, i) => {
            const v = board[i];
            cell.textContent = v || String(i + 1);
            cell.className = 'term-btn ttt-cell'
              + (v ? ' ' + v.toLowerCase() : ' empty')
              + (result && result.line.includes(i) ? ' win' : '')
              + (showCursor && !result && i === cursor ? ' cursor' : '');
          });
          statusEl.textContent = status();
          statusEl.classList.toggle('bright', !!result);
          scoreEl.textContent = vsComputer()
            ? `You (X): ${score.X}   Computer (O): ${score.O}   Draws: ${score.draw}`
            : `X: ${score.X}   O: ${score.O}   Draws: ${score.draw}`;
        }

        function quit() {
          exit(mode
            ? `Tic Tac Toe closed. Final score  X: ${score.X}  O: ${score.O}  Draws: ${score.draw}`
            : 'Tic Tac Toe closed.');
        }

        showMenu();

        return {
          onKey(e) {
            const k = e.key.toLowerCase();
            if (k === 'q' || k === 'escape') { quit(); return true; }
            if (!mode) {
              const m = MODES.find(m => m.key === e.key);
              if (m) choose(m);
              return !!m;
            }
            if (k === 'r') { newRound(); return true; }
            if (/^[1-9]$/.test(k)) {
              cursor = Number(k) - 1;
              humanMove(cursor);
              return true;
            }
            if (k in ARROWS) {
              const next = cursor + ARROWS[k];
              const sameRow = Math.floor(next / 3) === Math.floor(cursor / 3);
              if (next >= 0 && next < 9 && (Math.abs(ARROWS[k]) === 3 || sameRow)) cursor = next;
              showCursor = true;
              render();
              return true;
            }
            if (k === 'enter' || k === ' ') {
              if (result) newRound();
              else { showCursor = true; humanMove(cursor); render(); }
              return true;
            }
            return false;
          },
          destroy() {
            clearTimeout(aiTimer);
          },
        };
      });
    },
  });
})();
