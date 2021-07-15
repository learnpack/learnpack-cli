const path = require("path")
const {flags} = require('@oclif/command')
const SessionCommand = require('../utils/SessionCommand')
const Console = require('../utils/console')
const socket = require('../managers/socket.js')
const queue = require("../utils/fileQueue")
const { download, decompress, downloadEditor } = require('../managers/file.js')

const createServer = require('../managers/server')

class StartCommand extends SessionCommand {
  constructor(...params){
    super(...params)
  }

  // 🛑 IMPORTANT:
  // Every command that will use the configManager needs this init method
  async init() {
    const {flags} = this.parse(StartCommand)
    await this.initSession(flags)
  }

  async run() {

    // const {flags} = this.parse(StartCommand)

    // get configuration object
    const configObject = this.configManager.get()
    const { config } = configObject;

    // build exerises
    this.configManager.buildIndex()

    Console.debug(`Grading: ${config.grading} ${config.disable_grading ? "(disabled)" : ""}, editor: ${config.editor.mode} ${config.editor.version}, for ${Array.isArray(config.exercises) ? config.exercises.length : 0} exercises found`)

    // download app and decompress
    let resp = await downloadEditor(config.editor.version, `${config.dirPath}/app.tar.gz`)

    Console.info("Decompressing LearnPack UI, this may take a minute...")
    await decompress(`${config.dirPath}/app.tar.gz`, `${config.dirPath}/_app/`)

    const server = await createServer(configObject, this.configManager)

    const dispatcher = queue.dispatcher({ create: true, path: `${config.dirPath}/vscode_queue.json` })

    // listen to socket commands
    socket.start(config, server)

    socket.on("open", (data) => {
      Console.debug("Opening these files: ", data)
      dispatcher.enqueue(dispatcher.events.OPEN_FILES, data.files)
    })
    
    socket.on("open_window", (data) => {
      Console.debug(dispatcher.events.OPEN_WINDOW, data)
      dispatcher.enqueue(dispatcher.events.OPEN_WINDOW, data)
      socket.ready('Ready to compile...')
    })

    socket.on("reset", (exercise) => {
      try{
        this.configManager.reset(exercise.exerciseSlug)
        socket.ready('Ready to compile...')
      }
      catch(error){
        socket.error('compiler-error', error.message || "There was an error reseting the exercise")
        setTimeout(() => socket.ready('Ready to compile...'), 2000)
      }
    })
    // socket.on("preview", (data) => {
    //   Console.debug("Preview triggered, removing the 'preview' action ")
    //   socket.removeAllowed("preview")
    //   socket.log('ready',['Ready to compile...'])
    // })

    socket.on("build", async (data) => {
      const exercise = this.configManager.getExercise(data.exerciseSlug)
      
      if(!exercise.language){
        socket.error('compiler-error','Impossible to detect language to build for '+data.exerciseSlug+'...')
        return;
      }

      // validate plugins installation for compiler
      //if(!this.configManager.validateEngine(exercise.language, server, socket)) return false;

      socket.log('compiling','Building exercise '+data.exerciseSlug+' with '+exercise.language+'...')
      const stdout = await this.config.runHook('action', {
        action: 'compile',
        socket, configuration: config,
        exercise,
      })

      
    })

    socket.on("test", async (data) => {
        const exercise = this.configManager.getExercise(data.exerciseSlug)

        if(!exercise.language){
          socket.error('compiler-error','Impossible to detect engine language for testing for '+data.exerciseSlug+'...')
          return;
        } 

        if(config.disableGrading){
          socket.ready('Grading is disabled on configuration')
          return true;
        }

        // validate plugins installation for compiler
        //if(!this.configManager.validateEngine(exercise.language, server, socket)) return false;

        socket.log('testing','Testing your exercise using the '+exercise.language+' engine.')

        const stdout = await this.config.runHook('action', {
          action: 'test',
          socket, configuration: config,
          exercise,
        })
        this.configManager.save()

        return true;
    })

    const terminate = () => {
      Console.debug("Terminating Learnpack...")
      server.terminate(() => {
        this.configManager.noCurrentExercise()
        dispatcher.enqueue(dispatcher.events.END)
        process.exit();
      })
    }

    server.on('close', terminate);
    process.on('SIGINT', terminate);
    process.on('SIGTERM', terminate);
    process.on('SIGHUP', terminate);


    // finish the server startup
    setTimeout(() => dispatcher.enqueue(dispatcher.events.RUNNING), 1000)

    // start watching for file changes
    if(flags.watch) this.configManager.watchIndex((_exercises) => socket.reload(null, _exercises));

  }

}

StartCommand.description = `Runs a small server with all the exercise instructions`

StartCommand.flags = {
  ...SessionCommand.flags,
  port: flags.string({char: 'p', description: 'server port' }),
  host: flags.string({char: 'h', description: 'server host' }),
  disableGrading: flags.boolean({char: 'dg', description: 'disble grading functionality', default: false }),
  watch: flags.boolean({char: 'w', description: 'Watch for file changes', default: false }),
  mode: flags.string({ char: 'm', description: 'Load a standalone editor or just the preview to be embeded in another editor: Choices: [standalone, preview]', options: ['standalone', 'preview'] }),
  version: flags.string({ char: 'v', description: 'E.g: 1.0.1', default: null }),
  grading: flags.string({ char: 'g', description: '[isolated, incremental]', options: ['isolated', 'incremental'] }),
  debug: flags.boolean({char: 'd', description: 'debugger mode for more verbage', default: false })
}
module.exports = StartCommand
