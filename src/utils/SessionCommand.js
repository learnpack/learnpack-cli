const {flags} = require('@oclif/command')
const BaseCommand = require("./BaseCommand")
const Console = require('./console')
const SessionManager = require('../managers/session.js')
const ConfigManager = require('../managers/config/index.js')

class SessionCommand extends BaseCommand {
    constructor(...args){
        super(...args)
        this.configManager = null
        this.session = null
    }

    async initSession(flags){
        if(!this.configManager) await this.buildConfig(flags)
        
        this.session = await SessionManager.get(this.configManager.get())
        if(this.session) Console.debug(`Session open for ${s.payload.email}.`)
        else Console.debug("No active session available")
    }
    async buildConfig(flags){
        this.configManager = await ConfigManager(flags)
    }
    async catch(err) {
        Console.debug("COMMAND CATCH", err)
        throw err
    }
}

// SessionCommand.description = `Describe the command here
// ...
// Extra documentation goes here
// `

module.exports = SessionCommand