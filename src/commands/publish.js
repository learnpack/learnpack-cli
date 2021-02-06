const {Command, flags} = require('@oclif/command')
const { prompt } = require("enquirer")
const fetch = require('node-fetch');
const SessionCommand = require('../utils/SessionCommand')
const Console = require('../utils/console');
const api = require('../utils/api');
const { replace } = require('node-emoji');
const { validURL } = require("../utils/validators")
// const BaseCommand = require('../utils/BaseCommand');

class PublishCommand extends SessionCommand {
  async init() {
    const {flags} = this.parse(PublishCommand)
    await this.initSession(flags, true)
  }
  async run() {
    const {flags, args} = this.parse(PublishCommand)

    // avoid annonymus sessions
    if(!this.session) return;
    Console.info(`Session found for ${this.session.payload.email}, publishing the package...`)

    const configObject = this.configManager.get()
    if(configObject.slug === undefined || !configObject.slug)
      throw new Error("The package is missing a slug (unique name identifier), please check your learn.json file and make sure it has a 'slug'")
    if(!validURL(configObject.repository))
      throw new Error("The package has a missing or invalid 'repository' on the configuration file, it needs to be a Github URL")
    else{
      const validateResp = await fetch(configObject.repository);
      if(validateResp.status !== 200)
        throw new Error(`The specified repository URL on the configuration file does not exist or its private, only public repositories are allowed at the moment: ${configObject.repository}`)
    }

    // start watching for file changes
    try{
      const data = await api.publish({
        ...configObject,
        author: this.session.payload.user_id
      });
      Console.success(`Package updated and published successfully: ${configObject.slug}`)
    }catch(error){
      if(error.status === 404){
        const answer = await prompt([{
            type: 'confirm',
            name: 'create',
            message: `Package with slug ${configObject.slug} does not exist, do you want to create it?`,
        }])
        if(answer){
          const data2 = await api.update({
              ...configObject,
              author: this.session.payload.user_id
          })
          Console.success(`Package created and published successfully: ${configObject.slug}`)
        }
        else Console.error("No answer from server")
      }
      else Console.error(error.message)
    }
  }
}

PublishCommand.description = `Describe the command here
...
Extra documentation goes here
`
PublishCommand.flags = {
  // name: flags.string({char: 'n', description: 'name to print'}),
}
PublishCommand.args =[
  {
    name: 'package',               // name of arg to show in help and reference with args[name]
    required: false,            // make the arg required with `required: true`
    description: 'The unique string that identifies this package on learnpack', // help description
    hidden: false               // hide this arg from help
  }
]

module.exports = PublishCommand
