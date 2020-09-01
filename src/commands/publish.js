const {Command, flags} = require('@oclif/command')
const { prompt } = require("enquirer")
const fetch = require('node-fetch');
const SessionCommand = require('../utils/SessionCommand')
const Console = require('../utils/console');
const { replace } = require('node-emoji');
const { validURL } = require("../utils/validators")
// const BaseCommand = require('../utils/BaseCommand');

class PublishCommand extends SessionCommand {
  async run() {
    const {flags, args} = this.parse(PublishCommand)

    const configObject = this.configManager.get()
    if(configObject.slug === undefined || !configObject.slug) 
      throw new Error("The package is missing a slug (unique name identifier")
    if(!validURL(configObject.repository)) 
      throw new Error("The package has a missing or invalid 'repository' on the configuration file, it needs ot be a URL")
    else{
      const validateResp = await fetch(configObject.repository);
      if(validateResp.status !== 200) 
        throw new Error(`The specified repository URL on the configuration file does not exist or its private, only public repositories are allowed at the moment: ${configObject.repository}`)
    }
    
    const language =  configObject.config.language
    delete configObject.config
    delete configObject.exercises
    // start watching for file changes
    const resp = await fetch(`https://learnpack.herokuapp.com/v1/package/${configObject.slug}`,{
      method: 'PUT',
      headers: { "Content-Type": "application/json"},
      body: JSON.stringify({
        ...configObject,
        language,
        author: 1
      })
    })
    if(resp.status === 200){
      Console.success("Package updated and published successfully")
    }
    else if(resp.status === 404){
      const answer = await prompt([{
          type: 'confirm',
          name: 'create',
          message: `Package with slug ${configObject.slug} does not exist, do you want to create it?`,
      }])
      if(answer){
        const r = await fetch(`https://learnpack.herokuapp.com/v1/package/${configObject.slug}`,{
          method: 'POST',
          headers: { "Content-Type": "application/json"},
          body: JSON.stringify({
            ...configObject,
            language,
            author: 1
          })
        })
        if(r.status === 200){
          Console.success("Package created and published successfully")
        }
        else{
          const data = await r.json()
          Console.error(`Unexpected status ${r.status}`,data)
        }
      }
    }
    else{
      const data = await resp.json()
      Console.error(`Unexpected status ${resp.status}`,data)
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
