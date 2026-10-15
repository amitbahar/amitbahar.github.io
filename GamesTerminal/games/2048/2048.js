(function () {
  'use strict';

  const SIZE = 4;
  const GOAL = 2048;
  const BEST_KEY = '2048-best';

  const KEY_DIRS = {
    arrowup: 'up', w: 'up',
    arrowdown: 'down', s: 'down',
    arrowleft: 'left', a: 'left',
    arrowright: 'right', d: 'right',
  };

  function loadBest() {
    try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
  }

  function saveBest(value) {
    try { localStorage.setItem(BEST_KEY, String(value)); } catch { /* storage unavailable */ }
  }

  // Cell indices of row/column `i`, ordered from the edge the tiles slide toward.
  function lineIndices(dir, i) {
    const line = [];
    for (let j = 0; j < SIZE; j++) {
      line.push(dir === 'left' || dir === 'right' ? i * SIZE + j : j * SIZE + i);
    }
    return dir === 'right' || dir === 'down' ? line.reverse() : line;
  }

  Terminal.register({
    name: '2048',
    description: 'Slide and merge number tiles to reach 2048',
    run(term) {
      term.launch(({ root, exit }) => {
        let grid, score, state, keepPlaying;
        let best = loadBest();

        const info = term.div('line');
        const board = term.div('g2048-board');
        const tiles = Array.from({ length: SIZE * SIZE }, () => board.appendChild(term.div('g2048-tile')));
        const statusEl = term.div('line g2048-status');
        const actions = term.div('app-actions');
        actions.append(term.button('[R] restart', reset), term.button('[Q] quit', quit));

        root.append(
          term.div('app-title', '2048'),
          info, board, statusEl, actions,
          term.div('line muted hint', 'Keys: arrows/WASD (or swipe) to slide, R restart, Q quit'),
        );

        // Swipe on the board to slide.
        let touchStart = null;
        board.addEventListener('pointerdown', e => { touchStart = { x: e.clientX, y: e.clientY }; });
        board.addEventListener('pointerup', e => {
          if (!touchStart) return;
          const dx = e.clientX - touchStart.x;
          const dy = e.clientY - touchStart.y;
          touchStart = null;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
          if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left');
          else move(dy > 0 ? 'down' : 'up');
        });

        function reset() {
          grid = Array(SIZE * SIZE).fill(0);
          score = 0;
          state = 'playing';
          keepPlaying = false;
          addTile();
          addTile();
          draw();
        }

        function addTile() {
          const empty = grid.flatMap((v, i) => (v ? [] : [i]));
          if (empty.length) grid[empty[Math.floor(Math.random() * empty.length)]] = Math.random() < 0.9 ? 2 : 4;
        }

        function canMove() {
          for (let i = 0; i < grid.length; i++) {
            if (!grid[i]) return true;
            if (i % SIZE < SIZE - 1 && grid[i] === grid[i + 1]) return true;
            if (i + SIZE < grid.length && grid[i] === grid[i + SIZE]) return true;
          }
          return false;
        }

        function move(dir) {
          if (state !== 'playing') return;
          let moved = false;
          for (let i = 0; i < SIZE; i++) {
            const line = lineIndices(dir, i);
            const values = line.map(k => grid[k]).filter(Boolean);
            const merged = [];
            for (let j = 0; j < values.length; j++) {
              if (values[j] === values[j + 1]) {
                merged.push(values[j] * 2);
                score += values[j] * 2;
                j++; // each tile merges at most once per move
              } else {
                merged.push(values[j]);
              }
            }
            line.forEach((k, n) => {
              const value = merged[n] || 0;
              if (grid[k] !== value) moved = true;
              grid[k] = value;
            });
          }
          if (!moved) return;

          addTile();
          if (score > best) {
            best = score;
            saveBest(best);
          }
          if (!keepPlaying && grid.includes(GOAL)) state = 'won';
          else if (!canMove()) state = 'over';
          draw();
        }

        function draw() {
          tiles.forEach((tile, i) => {
            const v = grid[i];
            tile.textContent = v || '';
            tile.dataset.tier = v ? Math.min(Math.log2(v), 12) : '';
          });
          info.textContent = `Score: ${score}   Best: ${best}`;
          board.classList.toggle('over', state === 'over');
          statusEl.className = 'line g2048-status' + (state === 'playing' ? '' : ' bright');
          statusEl.textContent = {
            playing: '',
            won: 'You made 2048! Press Enter to keep going or R to restart.',
            over: 'No moves left. GAME OVER. Press R to try again.',
          }[state];
        }

        function quit() {
          exit(`2048 closed. Score: ${score}   Best: ${best}`);
        }

        reset();

        return {
          onKey(e) {
            const k = e.key.toLowerCase();
            if (k in KEY_DIRS) { move(KEY_DIRS[k]); return true; }
            if (k === 'q' || k === 'escape') { quit(); return true; }
            if (k === 'r') { reset(); return true; }
            if (k === 'enter' && state === 'won') {
              keepPlaying = true;
              state = canMove() ? 'playing' : 'over';
              draw();
              return true;
            }
            if (k === 'enter' && state === 'over') { reset(); return true; }
            return false;
          },
        };
      });
    },
  });
})();
