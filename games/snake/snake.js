(function () {
  'use strict';

  const COLS = 20;
  const ROWS = 15;
  const START_DELAY = 140; // ms per step
  const MIN_DELAY = 60;
  const SPEEDUP = 3;       // ms faster per food eaten
  const BEST_KEY = 'snake-best';

  const DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };

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

  Terminal.register({
    name: 'snake',
    description: "Play Snake: eat the food, grow longer, don't crash",
    run(term) {
      term.launch(({ root, exit }) => {
        let snake, dir, queue, food, score, state, newBest;
        let best = loadBest();
        let timer = null;

        root.classList.add('snake');
        const info = term.div('line');
        const board = term.div('snake-board');
        board.style.setProperty('--cols', COLS);
        board.style.aspectRatio = `${COLS} / ${ROWS}`;
        const cells = Array.from({ length: COLS * ROWS }, () => board.appendChild(term.div('snake-cell')));
        const statusEl = term.div('line snake-status');

        const actions = term.div('app-actions');
        actions.append(
          term.button('[P] pause', togglePause),
          term.button('[R] restart', reset),
          term.button('[Q] quit', quit),
        );

        // On-screen arrows for touch devices (shown via CSS on coarse pointers).
        const pad = term.div('snake-pad');
        for (const [name, label] of [['up', '▲'], ['left', '◀'], ['right', '▶'], ['down', '▼']]) {
          const btn = term.button(label, null, `pad-${name}`);
          btn.addEventListener('pointerdown', e => { e.preventDefault(); turn(name); });
          pad.append(btn);
        }

        root.append(
          term.div('app-title', 'SNAKE'),
          info, board, statusEl, actions, pad,
          term.div('line muted hint', 'Keys: arrows/WASD move, P/Space pause, R restart, Q quit'),
        );

        // Swipe on the board to turn; tap to start/pause/restart.
        let touchStart = null;
        board.addEventListener('pointerdown', e => { touchStart = { x: e.clientX, y: e.clientY }; });
        board.addEventListener('pointerup', e => {
          if (!touchStart) return;
          const dx = e.clientX - touchStart.x;
          const dy = e.clientY - touchStart.y;
          touchStart = null;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) togglePause();
          else if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 'right' : 'left');
          else turn(dy > 0 ? 'down' : 'up');
        });

        const onVisibility = () => { if (document.hidden && state === 'playing') pause(); };
        document.addEventListener('visibilitychange', onVisibility);

        function reset() {
          stop();
          const y = Math.floor(ROWS / 2);
          snake = [{ x: 6, y }, { x: 5, y }, { x: 4, y }];
          dir = 'right';
          queue = [];
          score = 0;
          newBest = false;
          food = placeFood();
          state = 'ready';
          draw();
        }

        function placeFood() {
          const taken = new Set(snake.map(p => p.y * COLS + p.x));
          const free = [];
          for (let i = 0; i < COLS * ROWS; i++) if (!taken.has(i)) free.push(i);
          if (!free.length) return null;
          const i = free[Math.floor(Math.random() * free.length)];
          return { x: i % COLS, y: Math.floor(i / COLS) };
        }

        function stop() {
          clearTimeout(timer);
          timer = null;
        }

        function schedule() {
          timer = setTimeout(step, Math.max(MIN_DELAY, START_DELAY - score * SPEEDUP));
        }

        function play() {
          stop();
          state = 'playing';
          draw();
          schedule();
        }

        function pause() {
          stop();
          state = 'paused';
          draw();
        }

        function togglePause() {
          if (state === 'playing') pause();
          else if (state === 'over') reset();
          else play();
        }

        // Queue turns so quick key presses between steps aren't lost.
        function turn(name) {
          if (state === 'over') return;
          const last = queue.length ? queue[queue.length - 1] : dir;
          const a = DIRS[name];
          const b = DIRS[last];
          const reverse = a.x === -b.x && a.y === -b.y;
          if (name !== last && !reverse && queue.length < 3) queue.push(name);
          if (state !== 'playing') play();
        }

        function step() {
          if (queue.length) dir = queue.shift();
          const head = snake[0];
          const next = { x: head.x + DIRS[dir].x, y: head.y + DIRS[dir].y };
          const eating = food && next.x === food.x && next.y === food.y;
          const body = eating ? snake : snake.slice(0, -1); // the tail moves out of the way
          const hitWall = next.x < 0 || next.y < 0 || next.x >= COLS || next.y >= ROWS;
          if (hitWall || body.some(p => p.x === next.x && p.y === next.y)) return gameOver();

          snake.unshift(next);
          if (eating) {
            score++;
            food = placeFood();
            if (!food) return gameOver();
          } else {
            snake.pop();
          }
          draw();
          schedule();
        }

        function gameOver() {
          stop();
          state = 'over';
          if (score > best) {
            best = score;
            newBest = true;
            saveBest(best);
          }
          draw();
        }

        function draw() {
          cells.forEach(cell => { cell.className = 'snake-cell'; });
          if (food) cells[food.y * COLS + food.x].className = 'snake-cell food';
          snake.forEach((p, i) => {
            cells[p.y * COLS + p.x].className = 'snake-cell ' + (i === 0 ? 'head' : 'body');
          });
          board.classList.toggle('crashed', state === 'over');

          info.textContent = `Score: ${score}   Best: ${best}   Length: ${snake.length}`;
          statusEl.className = 'line snake-status' + (state === 'over' ? ' bright' : '');
          statusEl.textContent = {
            ready: 'Press an arrow key (or swipe) to start.',
            playing: '',
            paused: 'Paused. Press P or Space to continue.',
            over: (food ? 'GAME OVER.' : 'You filled the board. You win!')
              + (newBest ? ' New best score!' : '')
              + ' Press R to play again or Q to quit.',
          }[state];
        }

        function quit() {
          exit(`Snake closed. Score: ${score}   Best: ${best}`);
        }

        reset();

        return {
          onKey(e) {
            const k = e.key.toLowerCase();
            if (k in KEY_DIRS) { turn(KEY_DIRS[k]); return true; }
            if (k === 'q' || k === 'escape') { quit(); return true; }
            if (k === 'p' || k === ' ') { togglePause(); return true; }
            if (k === 'r' || (k === 'enter' && state === 'over')) { reset(); return true; }
            return false;
          },
          destroy() {
            stop();
            document.removeEventListener('visibilitychange', onVisibility);
          },
        };
      });
    },
  });
})();
