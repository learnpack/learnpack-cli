const {Command, flags} = require('@oclif/command')
const fetch = require('node-fetch');
const { clone } = require('../managers/file.js')
const Console = require('../utils/console')
const api = require('../utils/api')
const { askPackage } = require('../ui/download')
// const BaseCommand = require('../utils/BaseCommand');

class DownloadCommand extends Command {
  // async init() {
  //   const {flags} = this.parse(DownloadCommand)
  //   await this.initSession(flags)
  // }
  async run() {
    const {flags, args} = this.parse(DownloadCommand)
    // start watching for file changes
    let _package = args.package
    if(!_package) _package = await askPackage()

    if(!_package) return null

    try{
      const packageInfo = await api.getAllPackages({ slug: _package })
      if(packageInfo.results.length == 0) Console.error(`Package ${_package} not found`)
      else clone(packageInfo.results[0].repository)
        .then(result => {
          Console.success(`Successfully downloaded`)
          Console.info(`You can now CD into the folder like this: $ cd ${_package}`)
        })
        .catch(error => Console.error(error.message || error))
    }
    catch(error){}
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
