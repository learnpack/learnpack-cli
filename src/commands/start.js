const path = require("path")
const {flags} = require('@oclif/command')
const SessionCommand = require('../utils/SessionCommand')
const Console = require('../utils/console')
const socket = require('../managers/socket.js')
const Gitpod = require('../managers/gitpod.js')
const { download, decompress, downloadEditor } = require('../managers/file.js')

const createServer = require('../managers/server')

const { ValidationError, InternalError, CompilerError } = require('../utils/errors.js')

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

    // listen to socket commands
    socket.start(config, server)

    socket.on("gitpod-open", (data) => {
      Console.debug("Opening these files on gitpod: ", data)
      Gitpod.openFile(data.files)
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

        socket.log('testing','Testing your exercise using the '+exercise.language+' engine.')

        const stdout = await this.config.runHook('action', {
          action: 'test',
          socket, configuration: config,
          exercise,
        })
        this.configManager.save()

        return true;
    })


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
  editor: flags.string({ char: 'e', description: '[standalone, gitpod]', options: ['standalone', 'gitpod'] }),
  version: flags.string({ char: 'v', description: 'E.g: 1.0.1', default: null }),
  grading: flags.string({ char: 'g', description: '[isolated, incremental]', options: ['isolated', 'incremental'] }),
  debug: flags.boolean({char: 'd', description: 'debugger mode for more verbage', default: false })
}
module.exports = StartCommand
