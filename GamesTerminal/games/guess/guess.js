(function () {
  'use strict';

  const MIN = 1;
  const MAX = 100;
  const BEST_KEY = 'guess-best';

  function loadBest() {
    try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
  }

  function saveBest(value) {
    try { localStorage.setItem(BEST_KEY, String(value)); } catch { /* storage unavailable */ }
  }

  Terminal.register({
    name: 'guess',
    description: `Guess the secret number between ${MIN} and ${MAX}`,
    run(term) {
      term.launch(({ root, exit }) => {
        let secret, typed, tries, low, high, won;
        let best = loadBest(); // fewest tries, 0 = none yet

        const log = term.div('guess-log');
        const entry = term.div('line guess-entry');
        const infoEl = term.div('line muted');

        // On-screen number pad for touch devices (shown via CSS).
        const pad = term.div('guess-pad');
        for (const label of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '⏎']) {
          pad.append(term.button(label, () => press(label === '⌫' ? 'backspace' : label === '⏎' ? 'enter' : label)));
        }

        const actions = term.div('app-actions');
        actions.append(term.button('[R] new number', newGame), term.button('[Q] quit', quit));

        root.append(
          term.div('app-title', 'GUESS THE NUMBER'),
          term.div('line', `I'm thinking of a number between ${MIN} and ${MAX}.`),
          log, entry, infoEl, pad, actions,
          term.div('line muted hint', 'Keys: type a number and press Enter, R new number, Q quit'),
        );

        function newGame() {
          secret = MIN + Math.floor(Math.random() * (MAX - MIN + 1));
          typed = '';
          tries = 0;
          low = MIN;
          high = MAX;
          won = false;
          log.replaceChildren();
          draw();
        }

        function submit() {
          if (won || !typed) return;
          const n = Number(typed);
          typed = '';
          const row = term.div('line');
          if (n < MIN || n > MAX) {
            row.textContent = `> ${n}   out of range (${MIN}-${MAX})`;
            row.classList.add('error');
          } else {
            tries++;
            if (n === secret) {
              won = true;
              const record = !best || tries < best;
              if (record) {
                best = tries;
                saveBest(best);
              }
              row.textContent = `> ${n}   CORRECT! Got it in ${tries} ${tries === 1 ? 'try' : 'tries'}.${record ? ' New best!' : ''}`;
              row.classList.add('bright');
            } else if (n < secret) {
              low = Math.max(low, n + 1);
              row.textContent = `> ${n}   too low`;
            } else {
              high = Math.min(high, n - 1);
              row.textContent = `> ${n}   too high`;
            }
          }
          log.append(row);
          draw();
        }

        function press(key) {
          if (key === 'enter') {
            if (won) newGame();
            else submit();
          } else if (key === 'backspace') {
            typed = typed.slice(0, -1);
          } else if (!won && typed.length < 3) {
            typed = (typed + key).replace(/^0+/, '');
          }
          draw();
        }

        function draw() {
          entry.replaceChildren();
          if (won) {
            entry.textContent = 'Press Enter or R to play again.';
          } else {
            const cursor = document.createElement('span');
            cursor.className = 'cursor';
            cursor.textContent = ' ';
            entry.append(`Your guess: ${typed}`, cursor);
          }
          infoEl.textContent = `Tries: ${tries}   Range: ${low}-${high}   Best: ${best ? best + ' tries' : '-'}`;
        }

        function quit() {
          exit(won || !tries
            ? 'Guess the Number closed.'
            : `Guess the Number closed. The number was ${secret}.`);
        }

        newGame();

        return {
          onKey(e) {
            const k = e.key.toLowerCase();
            if (k === 'q' || k === 'escape') { quit(); return true; }
            if (k === 'r') { newGame(); return true; }
            if (/^[0-9]$/.test(k) || k === 'enter' || k === 'backspace') { press(k); return true; }
            return false;
          },
        };
      });
    },
  });
})();
