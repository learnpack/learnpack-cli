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

    async init() {
        await this.initSession()
    }
    async initSession(){
        if(!this.configManager) await this.buildConfig()
        
        this.session = await SessionManager.get(this.configManager.get())
        if(this.session) Console.debug(`Session open for ${s.payload.email}.`)
        else Console.debug("No active session available")
    }
    async buildConfig(){
        const {flags} = this.parse(SessionCommand)
        this.configManager = ConfigManager(flags)
    }
    async catch(err) {
        Console.debug("COMMAND CATCH")
    
        // handle any error from the command
        const { flags } = this.parse(BaseCommand)
        throw err
        // if(flags.debug) throw err
        // else Console.error(err.message)
      }
}

// SessionCommand.description = `Describe the command here
// ...
// Extra documentation goes here
// `

SessionCommand.flags = {
    ...BaseCommand.flags,
    debug: flags.boolean({char: 'd', description: 'debugger mode for more verbage', default: false })
}

module.exports = SessionCommand