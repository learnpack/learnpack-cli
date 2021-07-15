const {Command, flags} = require('@oclif/command')
const Console = require('./console')
const SessionManager = require('../managers/session.js')


class BaseCommand extends Command {
  constructor(...params){
    super(...params)
  }
  async catch(err) {
    Console.debug("COMMAND CATCH", err)

    throw err
  }
  async init() {
    const {flags, args} = this.parse(BaseCommand)
    Console.debug("COMMAND INIT")
    Console.debug("These are your flags: ",flags);
    Console.debug("These are your args: ",args);

    // quick fix for listening to the process termination on windows
    process.on('SIGINT', function() {
      Console.debug("Terminated (SIGINT)")
      process.exit();
    });

  }
  async finally() {
    Console.debug("COMMAND FINALLY")
    // called after run and catch regardless of whether or not the command errored
  }
}

module.exports = BaseCommand
