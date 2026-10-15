/*
 * Terminal core: a small command registry plus the shell UI.
 *
 * To add a command, create a script (e.g. games/<name>/<name>.js or
 * js/commands/<name>.js), register it, and add a <script> tag for it in
 * index.html after terminal.js:
 *
 *   Terminal.register({
 *     name: 'hello',              // what the user types (may contain spaces)
 *     aliases: ['hi'],            // optional extra names
 *     description: 'Say hello',   // shown by `help`
 *     run(term, args) {           // args = words typed after the name
 *       term.print('Hello, ' + (args[0] || 'world') + '!');
 *     },
 *   });
 *
 * The `term` object passed to run():
 *   term.print(text, className?)             append a line of text
 *   term.append(element)                     append a DOM element
 *   term.div(className?, text?)              create a <div> (not appended)
 *   term.button(label, onClick?, className?) create a terminal-styled button
 *   term.commandLink(name)                   clickable command name that runs it
 *   term.launch(factory)                     start an interactive app
 *   term.clear()                             erase all output (the title banner stays)
 *
 * Interactive apps (games) take over the keyboard until they exit:
 *
 *   term.launch(({ root, exit }) => {
 *     root.append(...);                      // render into root
 *     return {
 *       onKey(event) { return true; },       // true = key was handled
 *       destroy() {},                        // clear timers / listeners
 *     };
 *   });
 *
 * exit(message?) ends the app, leaves its last frame in the scrollback and
 * returns to the prompt.
 */
(function () {
  'use strict';

  const registry = [];        // commands, in registration order
  const lookup = new Map();   // lowercase name or alias -> command

  const normalize = s => s.trim().toLowerCase().replace(/\s+/g, ' ');

  window.Terminal = {
    register(command) {
      if (!command || !command.name || typeof command.run !== 'function') {
        throw new Error('Terminal.register: a command needs a name and a run() function');
      }
      const keys = [command.name, ...(command.aliases || [])].map(normalize);
      for (const key of keys) {
        if (lookup.has(key)) throw new Error(`Terminal.register: "${key}" is already registered`);
      }
      registry.push(command);
      keys.forEach(key => lookup.set(key, command));
    },

    list() {
      return registry.slice();
    },
  };

  let screen, output, inputLine, input, promptTemplate, typedBefore, cursorEl, typedAfter;
  const history = [];
  let historyIndex = 0;
  let draft = '';
  let activeApp = null;

  /* ---------- output helpers ---------- */

  function scrollToBottom() {
    screen.scrollTop = screen.scrollHeight;
  }

  function div(className, text) {
    const el = document.createElement('div');
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }

  function append(el) {
    output.appendChild(el);
    scrollToBottom();
    return el;
  }

  function print(text = '', className) {
    return append(div('line' + (className ? ' ' + className : ''), text));
  }

  function echo(text) {
    const el = div('line');
    el.append(promptTemplate.cloneNode(true), text);
    append(el);
  }

  // Buttons never take focus, so Enter/Space keep going to the terminal or the app.
  function button(label, onClick, className) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'term-btn' + (className ? ' ' + className : '');
    btn.textContent = label;
    btn.tabIndex = -1;
    btn.addEventListener('mousedown', e => e.preventDefault());
    if (onClick) btn.addEventListener('click', onClick);
    return btn;
  }

  function commandLink(name) {
    const btn = button(name, () => {
      if (activeApp) return;
      submit(name);
      if (!activeApp) focusInput();
    });
    btn.className = 'cmd-link';
    return btn;
  }

  /* ---------- interactive apps ---------- */

  function launch(factory) {
    const root = div('app');
    append(root);
    inputLine.hidden = true;
    input.blur();

    let app = null;
    let done = false;
    const observer = new ResizeObserver(scrollToBottom);
    observer.observe(root);

    const exit = message => {
      if (done) return;
      done = true;
      if (app && app.destroy) app.destroy();
      observer.disconnect();
      root.classList.add('app-done');
      root.inert = true;
      activeApp = null;
      if (message) print(message, 'muted');
      inputLine.hidden = false;
      focusInput();
      scrollToBottom();
    };

    app = factory({ root, exit }) || {};
    if (!done) activeApp = app;
    scrollToBottom();
  }

  // The banner sits outside #output, so it survives a clear.
  function clear() {
    output.replaceChildren();
  }

  const term = { print, append, div, button, commandLink, launch, clear };

  /* ---------- command execution ---------- */

  // Longest registered name wins, so multi-word names like "tic tac toe" work.
  function resolve(text) {
    const words = text.split(/\s+/);
    for (let n = words.length; n > 0; n--) {
      const command = lookup.get(words.slice(0, n).join(' ').toLowerCase());
      if (command) return { command, args: words.slice(n) };
    }
    return null;
  }

  function submit(raw) {
    echo(raw);
    const text = raw.trim();
    if (text && history[history.length - 1] !== text) history.push(text);
    historyIndex = history.length;
    draft = '';
    if (!text) return;

    const match = resolve(text);
    if (!match) {
      print(`command not found: ${text}`, 'error');
      const hint = div('line muted');
      hint.append('Type ', commandLink('help'), ' to see the available commands.');
      append(hint);
      return;
    }
    try {
      match.command.run(term, match.args);
    } catch (err) {
      console.error(err);
      print(`${match.command.name}: ${err.message}`, 'error');
    }
  }

  /* ---------- input line ---------- */

  function renderInput() {
    const value = input.value;
    const pos = input.selectionStart ?? value.length;
    typedBefore.textContent = value.slice(0, pos);
    cursorEl.textContent = value[pos] || ' ';
    typedAfter.textContent = value.slice(pos + 1);
  }

  function setInput(value) {
    input.value = value;
    input.setSelectionRange(value.length, value.length);
    renderInput();
  }

  function focusInput() {
    if (activeApp) return;
    input.focus({ preventScroll: true });
    scrollToBottom();
  }

  function complete() {
    const value = normalize(input.value);
    if (!value) return;
    const names = [...lookup.keys()].filter(name => name.startsWith(value));
    if (names.length === 1) {
      setInput(names[0]);
    } else if (names.length > 1) {
      // Fill in the shared prefix, then list the options.
      let prefix = names[0];
      for (const name of names) while (!name.startsWith(prefix)) prefix = prefix.slice(0, -1);
      echo(input.value);
      print(names.join('    '), 'muted');
      setInput(prefix);
    }
  }

  function onInputKey(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = input.value;
      setInput('');
      submit(value);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex > 0) {
        if (historyIndex === history.length) draft = input.value;
        historyIndex--;
        setInput(history[historyIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex < history.length) {
        historyIndex++;
        setInput(historyIndex === history.length ? draft : history[historyIndex]);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      complete();
    } else if (e.ctrlKey && e.key.toLowerCase() === 'c' && !window.getSelection().toString()) {
      e.preventDefault();
      echo(input.value + '^C');
      setInput('');
    }
    // Let the caret move first, then redraw the block cursor.
    requestAnimationFrame(renderInput);
  }

  /* ---------- boot ---------- */

  function boot() {
    screen = document.getElementById('screen');
    output = document.getElementById('output');
    inputLine = document.getElementById('input-line');
    input = document.getElementById('input');
    typedBefore = document.getElementById('typed-before');
    cursorEl = document.getElementById('cursor');
    typedAfter = document.getElementById('typed-after');
    promptTemplate = inputLine.querySelector('.prompt');

    input.addEventListener('keydown', onInputKey);
    input.addEventListener('input', renderInput);
    input.addEventListener('focus', () => inputLine.classList.add('focused'));
    input.addEventListener('blur', () => inputLine.classList.remove('focused'));

    // Keys go to the running app; otherwise typing anywhere focuses the prompt.
    document.addEventListener('keydown', e => {
      if (activeApp) {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        if (activeApp.onKey && activeApp.onKey(e)) e.preventDefault();
        return;
      }
      if (document.activeElement !== input && !e.metaKey && !e.ctrlKey && !e.altKey && e.key.length === 1) {
        focusInput();
      }
    });

    screen.addEventListener('click', () => {
      if (!window.getSelection().toString()) focusInput();
    });

    print('Welcome to amitbahar.github.io', 'bright');
    print('');
    const intro = div('line');
    intro.append('Type ', commandLink('help'), ' and press Enter to see the available commands.');
    append(intro);
    print('');

    renderInput();
    focusInput();
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
