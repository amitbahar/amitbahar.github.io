(function () {
  'use strict';

  const MAX_WRONG = 6;
  const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

  const WORDS = [
    'terminal', 'keyboard', 'javascript', 'computer', 'program', 'network',
    'penguin', 'galaxy', 'rocket', 'planet', 'dinosaur', 'pyramid',
    'volcano', 'jungle', 'island', 'castle', 'dragon', 'wizard',
    'pirate', 'treasure', 'compass', 'lantern', 'harbor', 'glacier',
    'thunder', 'rainbow', 'whisper', 'mystery', 'puzzle', 'quantum',
    'algorithm', 'variable', 'function', 'browser', 'monitor', 'pixel',
    'library', 'journey', 'balloon', 'chocolate', 'umbrella', 'kangaroo',
    'giraffe', 'octopus', 'squirrel', 'elephant', 'butterfly', 'saxophone',
    'zeppelin', 'jazz', 'oxygen', 'avocado', 'blizzard', 'cactus',
  ];

  // ASCII gallows for 0..6 wrong guesses.
  function gallows(wrong) {
    const part = (n, ch) => (wrong >= n ? ch : ' ');
    return [
      '  +---+',
      '  |   |',
      `  ${part(1, 'O')}   |`,
      ` ${part(3, '/')}${part(2, '|')}${part(4, '\\')}  |`,
      ` ${part(5, '/')} ${part(6, '\\')}  |`,
      '      |',
      '=========',
    ].join('\n');
  }

  Terminal.register({
    name: 'hangman',
    description: 'Guess the hidden word one letter at a time',
    run(term) {
      term.launch(({ root, exit }) => {
        let word, guessed, wrong, state; // state: 'playing' | 'won' | 'lost'
        let wins = 0;
        let losses = 0;
        let lastWord = null;

        const art = document.createElement('pre');
        art.className = 'hangman-art';
        const wordEl = term.div('line hangman-word');
        const infoEl = term.div('line muted');
        const statusEl = term.div('line hangman-status');

        // Clickable on-screen keyboard (letters can also be typed).
        const keyboard = term.div('hangman-keys');
        const keys = {};
        for (const letter of ALPHABET) {
          keys[letter] = keyboard.appendChild(term.button(letter.toUpperCase(), () => guess(letter), 'hangman-key'));
        }

        const actions = term.div('app-actions');
        actions.append(term.button('[Enter] new word', newGame), term.button('[Esc] quit', quit));

        root.append(
          term.div('app-title', 'HANGMAN'),
          art, wordEl, infoEl, statusEl, keyboard, actions,
          term.div('line muted hint', 'Keys: type letters to guess, Enter for a new word, Esc to quit'),
        );

        function newGame() {
          do {
            word = WORDS[Math.floor(Math.random() * WORDS.length)];
          } while (word === lastWord);
          lastWord = word;
          guessed = new Set();
          wrong = 0;
          state = 'playing';
          draw();
        }

        function guess(letter) {
          if (state !== 'playing' || guessed.has(letter)) return;
          guessed.add(letter);
          if (!word.includes(letter)) wrong++;
          if ([...word].every(ch => guessed.has(ch))) {
            state = 'won';
            wins++;
          } else if (wrong >= MAX_WRONG) {
            state = 'lost';
            losses++;
          }
          draw();
        }

        function draw() {
          art.textContent = gallows(wrong);
          art.classList.toggle('lost', state === 'lost');
          wordEl.textContent = [...word]
            .map(ch => (guessed.has(ch) || state === 'lost' ? ch.toUpperCase() : '_'))
            .join(' ');
          const misses = [...guessed].filter(ch => !word.includes(ch)).map(ch => ch.toUpperCase());
          infoEl.textContent = `Wrong: ${misses.join(' ') || '-'}   Lives: ${MAX_WRONG - wrong}   Wins: ${wins}   Losses: ${losses}`;
          statusEl.className = 'line hangman-status' + (state === 'lost' ? ' error' : state === 'won' ? ' bright' : '');
          statusEl.textContent = {
            playing: `The word has ${word.length} letters.`,
            won: 'You got it! Press Enter for a new word.',
            lost: `Hanged! The word was "${word.toUpperCase()}". Press Enter to try again.`,
          }[state];
          for (const letter of ALPHABET) {
            const key = keys[letter];
            key.classList.toggle('used', guessed.has(letter));
            key.classList.toggle('hit', guessed.has(letter) && word.includes(letter));
          }
        }

        function quit() {
          exit(`Hangman closed. Wins: ${wins}   Losses: ${losses}`);
        }

        newGame();

        // Q and R are letters here, so only Escape quits.
        return {
          onKey(e) {
            const k = e.key.toLowerCase();
            if (k === 'escape') { quit(); return true; }
            if (k === 'enter') { newGame(); return true; }
            if (k.length === 1 && ALPHABET.includes(k)) { guess(k); return true; }
            return false;
          },
        };
      });
    },
  });
})();
