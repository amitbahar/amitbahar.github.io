Terminal.register({
  name: 'clear',
  aliases: ['cls'],
  description: 'Clear the terminal screen',
  run(term) {
    term.clear();
  },
});
