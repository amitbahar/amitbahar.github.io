Terminal.register({
  name: 'help',
  description: 'List all available commands',
  run(term) {
    term.print('Available commands:');
    const table = term.div('help-table');
    for (const command of Terminal.list()) {
      const name = term.div();
      name.append(term.commandLink(command.name));
      let text = command.description || '';
      if (command.aliases && command.aliases.length) text += ` (also: ${command.aliases.join(', ')})`;
      table.append(name, term.div('muted', text));
    }
    term.append(table);
    term.print('Tip: click a command, press Tab to autocomplete, use ↑/↓ for history.', 'muted');
  },
});
