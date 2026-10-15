# amitbahar.github.io

Amit Bahar & Yaniv Hayoun's retro terminal homepage, built with plain HTML, CSS and JavaScript (no server, no build step, no dependencies).

Live at https://amitbahar.github.io/ (redirects to https://amitbahar.github.io/GamesTerminal/). To run it locally, open `GamesTerminal/index.html` in a browser.

## Layout

```
index.html                          redirects to GamesTerminal/
GamesTerminal/
  index.html                        terminal page
  css/terminal.css                  terminal look
  js/terminal.js                    terminal core: command registry + shell
  js/commands/help.js               the `help` command
  js/commands/clear.js              the `clear` command
  games/tictactoe/                  `tic tac toe` command (JS + CSS)
  games/snake/                      `snake` command
  games/2048/                       `2048` command
  games/hangman/                    `hangman` command
  games/guess/                      `guess` command (guess the number)
```

## Adding a command

1. Create a script, e.g. `GamesTerminal/js/commands/hello.js` (or `GamesTerminal/games/<name>/<name>.js` for a game):

   ```js
   Terminal.register({
     name: 'hello',
     description: 'Say hello',
     run(term, args) {
       term.print('Hello, ' + (args[0] || 'world') + '!');
     },
   });
   ```

2. Add `<script src="js/commands/hello.js"></script>` to `GamesTerminal/index.html` after `js/terminal.js` (plus a `<link>` for any CSS).

`help` lists every registered command automatically. See the comment at the top of `GamesTerminal/js/terminal.js` for the full `term` API, including `term.launch()` for interactive games.
