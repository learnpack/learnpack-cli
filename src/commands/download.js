const {Command, flags} = require('@oclif/command')
const Console = require('../utils/console')
// const BaseCommand = require('../utils/BaseCommand');

class DownloadCommand extends Command {
  async run() {
    const {flags, args} = this.parse(DownloadCommand)
    // start watching for file changes
    Console.info(`Downloading the package ${args.package}`)
    Console.success(`Successfully downloaded`)
  }
}

DownloadCommand.description = `Describe the command here
...
Extra documentation goes here
`
DownloadCommand.flags = {
  // name: flags.string({char: 'n', description: 'name to print'}),
}
DownloadCommand.args =[
  {
    name: 'package',               // name of arg to show in help and reference with args[name]
    required: false,            // make the arg required with `required: true`
    description: 'The unique string that identifies this package on learnpack', // help description
    hidden: false               // hide this arg from help
  }
]

module.exports = DownloadCommand
