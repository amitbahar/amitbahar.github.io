# amitbahar.github.io

A retro terminal homepage, built with plain HTML, CSS and JavaScript (no server, no build step, no dependencies).

Live at https://amitbahar.github.io/. To run it locally, open `index.html` in a browser.

## Layout

```
index.html              terminal page (the homepage)
css/terminal.css        terminal look
js/terminal.js          terminal core: command registry + shell
js/commands/help.js     the `help` command
games/tictactoe/        `tic tac toe` command (JS + CSS)
games/snake/            `snake` command (JS + CSS)
```

## Adding a command

1. Create a script, e.g. `js/commands/hello.js` (or `games/<name>/<name>.js` for a game):

   ```js
   Terminal.register({
     name: 'hello',
     description: 'Say hello',
     run(term, args) {
       term.print('Hello, ' + (args[0] || 'world') + '!');
     },
   });
   ```

2. Add `<script src="js/commands/hello.js"></script>` to `index.html` after `js/terminal.js` (plus a `<link>` for any CSS).

`help` lists every registered command automatically. See the comment at the top of `js/terminal.js` for the full `term` API, including `term.launch()` for interactive games.
