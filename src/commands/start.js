const {flags} = require('@oclif/command')
const SessionCommand = require('../utils/SessionCommand')
let Console = require('../utils/console')



// const socket = require('../managers/socket.js')
// const bcPrettier = require('../../utils/bcPrettier.js')
// const TestManager = require('../../utils/bcTest.js')
// const Gitpod = require('../../utils/bcGitpod.js')
const createServer = require('../managers/server')

const { ValidationError, NotFoundError } = require('../utils/errors.js')

class StartCommand extends SessionCommand {
  async run() {

    const {flags} = this.parse(StartCommand)

    
    // get configuration object
    const config = this.configManager.get()
    // build exerises
    this.configManager.buildIndex()

    Console.debug(`Compiler: ${config.compiler}, grading: ${config.grading} ${config.disable_grading ? "(disabled)" : ""}, editor: ${config.editor}, for ${Array.isArray(config.exercises) ? config.exercises.length : 0} exercises found`)
    
    // download app
    const download = require('../managers/download.js')
    await download('https://raw.githubusercontent.com/breatheco-de/breathecode-ide/master/dist/app.tar.gz', config.configPath.base+'/_app/app.tar.gz')
    
    const server = await createServer(config)
    
    // listen to socket commands
    // socket.start(config, server)
    // socket.on("gitpod-open", (data) => {
    //   Console.debug("Opening these files on gitpod: ", data)
    //   Gitpod.openFile(data.files)
    // })
    // socket.on("reset", (exercise) => {
    //   Console.debug("Reseting exercise "+exercise.exerciseSlug)
    //   try{
    //     exercises.reset(exercise.exerciseSlug)
    //     socket.log('ready',['Ready to compile...'])
    //   }
    //   catch(error){
    //     socket.log('error',[error.message || "There was an error reseting the exercise"])
    //   }
    // })
    // socket.on("preview", (data) => {
    //   Console.debug("Preview triggered, removing the 'preview' action ")
    //   socket.removeAllowed("preview")
    //   socket.log('ready',['Ready to compile...'])
    // })

    // socket.on("build", (data) => {
    //     const compiler = require('../../utils/config/compiler/'+config.compiler+'.js')
    //     socket.log('compiling',['Building exercise '+data.exerciseSlug])
    //     const files = exercises.getAllFiles(data.exerciseSlug)

    //     compiler({ files, socket, config })
    //       // .then(() => console.log("Finish running"))
    //       .catch(error => {
    //         const message = error.message || 'There has been an uknown error'
    //         socket.log(error.type || 'internal-error', [ message ], [], error)
    //         Console.error(message)
    //         Console.debug(error)
    //       })
    // })

    // socket.on("run", (data) => {
    //     const compiler = require('../../utils/config/compiler/'+config.compiler+'.js')
    //     socket.log('compiling',['Compiling exercise '+data.exerciseSlug])
    //     compiler({
    //       files: exercises.getExerciseDetails(data.exerciseSlug).files,
    //       socket: socket,
    //       config
    //     })
    //     .catch(error => {
    //       const message = error.message || 'There has been an uknown error'
    //       socket.log(error.type || 'internal-error', [ message ], [], error)
    //       Console.error(message)
    //       Console.debug(error)
    //     })
    // })

    // socket.on("test", (data) => {
    //     socket.log('testing',['Testing your code output'])
    //     bcTest({
    //       files: exercises.getAllFiles(data.exerciseSlug),
    //       socket,
    //       config,
    //       slug: data.exerciseSlug
    //     })
    //     .then(result => {
    //       exercises.save()
    //     })
    //     .catch(error => {
    //       const message = error.message || 'There has been an uknown error'
    //       socket.log(error.type || 'internal-error', [ message ], [], error)
    //       Console.error(message)
    //       Console.debug(error)
    //     })
    // })

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
  language: flags.string({char:'l', description: 'specify what language you want: [html, css, react, vanilajs, node, python]'}),
  port: flags.string({char: 'p', description: 'server port' }),
  host: flags.string({char: 'h', description: 'server host' }),
  create_mode: flags.boolean({char: 'c', description: 'start the exercises on create mode (for teachers)', default: false }),
  disable_grading: flags.boolean({char: 'dg', description: 'disble grading functionality', default: false }),
  editor: flags.string({ char: 'e', description: '[standalone, gitpod]', options: ['standalone', 'gitpod'] }),
  grading: flags.string({ char: 'g', description: '[isolated, incremental]', options: ['isolated', 'incremental'] }),
}
module.exports = StartCommand