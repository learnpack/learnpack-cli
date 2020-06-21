const {flags} = require('@oclif/command')
const SessionCommand = require('../utils/SessionCommand')

class CreateCommand extends SessionCommand {
  async run() {
    const {flags} = this.parse(CreateCommand)
    const config = ConfigManager(flags);
    // start watching for file changes
    config.watchIndex((_exercises) => socket.reload(null, _exercises));
  }
}

CreateCommand.description = `Describe the command here
...
Extra documentation goes here
`

CreateCommand.flags = {
  name: flags.string({char: 'n', description: 'name to print'}),
}

module.exports = CreateCommand
