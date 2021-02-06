const {Command, flags} = require('@oclif/command')
const { prompt } = require("enquirer")
const fetch = require('node-fetch');
const SessionCommand = require('../utils/SessionCommand')
const SessionManager = require('../managers/session.js')
const Console = require('../utils/console');
const { replace } = require('node-emoji');
const { validURL } = require("../utils/validators")
// const BaseCommand = require('../utils/BaseCommand');

class PublishCommand extends SessionCommand {
  async init() {
    const {flags} = this.parse(PublishCommand)
    await this.initSession(flags)
  }
  async run() {
    const {flags, args} = this.parse(PublishCommand)

    try{
      await SessionManager.login();
    }
    catch(error){
      Console.error("Error trying to authenticate")
      Console.error(error.message || error)
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
