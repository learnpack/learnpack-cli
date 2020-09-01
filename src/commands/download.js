const {Command, flags} = require('@oclif/command')
const fetch = require('node-fetch');
const { clone } = require('../managers/file.js')
const Console = require('../utils/console')
const { askPackage } = require('../ui/download')
// const BaseCommand = require('../utils/BaseCommand');

class DownloadCommand extends Command {
  async run() {
    const {flags, args} = this.parse(DownloadCommand)
    // start watching for file changes
    let _package = args.package
    if(!_package) _package = await askPackage()

    if(!_package) throw Error("No package name specified")

    const resp = await fetch(`https://learnpack.herokuapp.com/v1/package/${_package}`)
    if(resp.status === 404){
      Console.error(`Package ${_package} does not exist`)
    }
    else{
      const packageInfo = await resp.json()
      clone(packageInfo.repository)
        .then(result => {
          Console.success(`Successfully downloaded`)
          Console.info(`You can now CD into the folder like this: $ cd ${_package}`)
        })
        .catch(error => Console.error(error.message || error))
    }
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
