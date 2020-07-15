const path = require("path")
const {flags} = require('@oclif/command')
const SessionCommand = require('../utils/SessionCommand')
const Console = require('../utils/console')
const socket = require('../managers/socket.js')
const { download, decompress, downloadEditor } = require('../managers/file.js')



// const bcPrettier = require('../../utils/bcPrettier.js')
// const TestManager = require('../../utils/bcTest.js')
// const Gitpod = require('../../utils/bcGitpod.js')
const createServer = require('../managers/server')

const { ValidationError, NotFoundError } = require('../utils/errors.js')

class StartCommand extends SessionCommand {
  async run() {

    const {flags} = this.parse(StartCommand)

    
    // get configuration object
    const configObject = this.configManager.get()
    const { config } = configObject;

    // build exerises
    this.configManager.buildIndex()

    Console.debug(`Compiler: ${config.compiler}, grading: ${config.grading} ${config.disable_grading ? "(disabled)" : ""}, editor: ${config.editor}, for ${Array.isArray(config.exercises) ? config.exercises.length : 0} exercises found`)
    
    // download app and decompress
    let resp = await downloadEditor(config.editor.version, `${config.dirPath}/app.tar.gz`)
    await decompress(`${config.dirPath}/app.tar.gz`, `${config.dirPath}/_app/`)
    
    const server = await createServer(configObject, this.configManager)
    
    // listen to socket commands
    socket.start(config, server)
    // socket.on("gitpod-open", (data) => {
    //   Console.debug("Opening these files on gitpod: ", data)
    //   Gitpod.openFile(data.files)
    // })
    socket.on("reset", (exercise) => {
      try{
        this.configManager.reset(exercise.exerciseSlug)
        socket.ready('Ready to compile...')
      }
      catch(error){
        socket.fatal(error.message || "There was an error reseting the exercise")
      }
    })
    // socket.on("preview", (data) => {
    //   Console.debug("Preview triggered, removing the 'preview' action ")
    //   socket.removeAllowed("preview")
    //   socket.log('ready',['Ready to compile...'])
    // })

    socket.on("build", async (data) => {
      const exercise = this.configManager.getExercise(data.exerciseSlug)
      socket.log('compiling','Building exercise '+data.exerciseSlug)
      console.log(exercise)
      const stdout = await this.config.runHook('action', {
        action: 'compile',
        socket, configuration: config,
        exercise,
      })
    })

    socket.on("test", async (data) => {
        const exercise = this.configManager.getExercise(data.exerciseSlug)

        if(config.ignoreTests){
          socket.ready('Grading is disabled on learn.json file.')
          return true;
        }

        socket.log('testing','Testing your code output')

        const stdout = await this.config.runHook('action', {
          action: 'test',
          socket, configuration: config,
          exercise,
        })
        this.configManager.save()

        return true;
    })

    // socket.on("prettify", (data) => {
    //     socket.log('prettifying',['Making your code prettier'])
    //     bcPrettier({
    //       config,
    //       socket,
    //       exerciseSlug: data.exerciseSlug,
    //       fileName: data.fileName
    //     })
    // })

  }
}

StartCommand.description = `Runs a small server with all the exercise instructions`

StartCommand.flags = {
  ...SessionCommand,
  port: flags.string({char: 'p', description: 'server port' }),
  host: flags.string({char: 'h', description: 'server host' }),
  disableGrading: flags.boolean({char: 'dg', description: 'disble grading functionality', default: false }),
  editor: flags.string({ char: 'e', description: '[standalone, gitpod]', options: ['standalone', 'gitpod'] }),
  grading: flags.string({ char: 'g', description: '[isolated, incremental]', options: ['isolated', 'incremental'] }),
  debug: flags.boolean({char: 'd', description: 'debugger mode for more verbage', default: false })
}
module.exports = StartCommand