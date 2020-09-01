const {flags} = require('@oclif/command')
const Console = require('../utils/console')
const SessionCommand = require('../utils/SessionCommand')
class CleanCommand extends SessionCommand {
  async run() {
    const {flags} = this.parse(CleanCommand)
    
    this.configManager.clean()

    Console.success("JSON Configuration cleaned successfully")
  }
}

CleanCommand.description = `Clean the configuration object
...
Extra documentation goes here
`

CleanCommand.flags = {
  // name: flags.string({char: 'n', description: 'name to print'}),
}

module.exports = CleanCommand
