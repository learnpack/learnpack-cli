const {flags} = require('@oclif/command')
const Console = require('../utils/console')
const SessionCommand = require('../utils/SessionCommand')
class CleanCommand extends SessionCommand {
  async init() {
    const {flags} = this.parse(CleanCommand)
    await this.initSession(flags)
  }
  async run() {
    const {flags} = this.parse(CleanCommand)
    
    this.configManager.clean()

    Console.success("Package cleaned successfully, ready to publish")
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
