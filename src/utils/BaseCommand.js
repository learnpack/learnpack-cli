const {Command, flags} = require('@oclif/command')
const Console = require('./console')
const SessionManager = require('../managers/session.js')
const ConfigManager = require('../managers/config.js')

class BaseCommand extends Command {
  constructor(...params){
    super(...params)
  }
  async catch(err) {
    Console.debug("COMMAND CATCH")

    // handle any error from the command
    const { flags } = this.parse(BaseCommand)
    throw err
    // if(flags.debug) throw err
    // else Console.error(err.message)
  }
  async init() {
    const {flags, args} = this.parse(BaseCommand)
    if(flags.debug) Console.startDebug()
    Console.debug("COMMAND INIT")
    Console.debug("These are your flags: ",flags);
    Console.debug("These are your args: ",args);

    // quick fix for listening to the process termination on windows
    if (process.platform === "win32") {
      var rl = require("readline").createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.on("SIGINT", function () {
        process.emit("SIGINT");
      });
    }

  }
  async finally() {
    Console.debug("COMMAND FINALLY")
    // called after run and catch regardless of whether or not the command errored
  }
}

// BaseCommand.description = `Describe the command here
// ...
// Extra documentation goes here
// `

BaseCommand.flags = {
    ...Command.flags,
    debug: flags.boolean({char: 'd', description: 'debugger mode for more verbage', default: false })
}

module.exports = BaseCommand