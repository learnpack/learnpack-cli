const path = require('path')
const fs = require('fs')
let shell = require('shelljs')
let Console = require('../../utils/console')
let watch = require('../../utils/watcher')
const Gitpod = require('../gitpod')
const { ValidationError, NotFoundError } = require('../../utils/errors.js')
const frontMatter = require('front-matter')
let defaults = require('./defaults.js')
let exercise = require('./exercise.js')
/* exercise folder name standard */


const merge = (target, ...sources) =>
  Object.assign(target, ...sources.map(x =>
    Object.entries(x)
      .filter(([key, value]) => typeof value !== 'undefined')
      .reduce((obj, [key, value]) => (obj[key] = value, obj), {})
  ))

const getConfigPath = () => {
  const possibleFileNames = ['learn.json', '.learn/learn.json','bc.json','.breathecode/bc.json']
  let config = possibleFileNames.find(file => fs.existsSync(file)) || null
  if(config && fs.existsSync(".breathecode")) return { config, base: ".breathecode" }
  else if(config === null) throw NotFoundError("learn.json file not found on current folder")
  return { config, base: ".learn" }
}

const getExercisesPath = (base) => {
  const possibleFileNames = ['./exercises',base+'/exercises','./']
  return possibleFileNames.find(file => fs.existsSync(file)) || null
}

module.exports = ({ grading, editor, disableGrading }) => {

    let confPath = getConfigPath()
    Console.debug("This is the config path: ", confPath)

    let config = {}
    if (confPath){
      const bcContent = fs.readFileSync(confPath.config)
      const jsonConfig = JSON.parse(bcContent)
      if(!jsonConfig) throw Error(`Invalid ${confPath.config} syntax: Unable to parse.`)

      //add using id to the installation
      if(!jsonConfig.session) jsonConfig.session = Math.floor(Math.random() * 10000000000000000000)

      config = merge(jsonConfig,{ disableGrading })
      Console.debug("This is your configuration file: ",config)
    }
    else{
      throw ValidationError("No learn.json file has been found, make sure you are in the folder")
    }

    // Assign default editor mode if not set already
    if(!config.editor){
      if (shell.which('gp')) config.editor = "gitpod"
      else config.editor = "standalone"
    }

    config = merge(defaults || {}, config, { grading, editor, configPath: confPath } )
    config.configPath.exercisesPath = getExercisesPath(confPath.base)
    config.configPath.output = confPath.base+"/dist"

    Console.debug("This is your updated configuration: ", config)

    if(config.editor === "gitpod") Gitpod.setup(config)

    if (config.grading === 'isolated' && !config.configPath.exercisesPath)  throw Error(`You are running with ${config.grading} grading, so make sure you have an "exercises" folder`)

    return {
        get: () => config,
        getExercise: (slug) => {
          const exercise = config.exercises.find(ex => ex.slug == slug)
          if(!exercise) throw new ValidationError(`Exercise ${slug} not found`)

          return exercise
        },
        reset: (slug) => {
          if (!fs.existsSync(`${config.configPath.base}/resets/`+slug)) throw new Error("Could not find the original files for "+slug)

          const exercise = config.exercises.find(ex => ex.slug == slug)
          if(!exercise) throw new ValidationError(`Exercise ${slug} not found on the configuration`)

          fs.readdirSync(`${config.configPath.base}/resets/${slug}/`)
            .forEach(fileName => {
              const content = fs.readFileSync(`${config.configPath.base}/resets/${slug}/${fileName}`)
              fs.writeFileSync(`${exercise.path}/${fileName}`, content)
            })
        },
        buildIndex: function(){
            Console.info("Building the exercise index...")

            const isDirectory = source => {
              if(path.basename(source) === path.basename(config.dirPath)) return false
              return fs.lstatSync(source).isDirectory()
            }
            const getDirectories = source => fs.readdirSync(source).map(name => path.join(source, name)).filter(isDirectory)
            // add the .learn folder
            if (!fs.existsSync(config.configPath.base)) fs.mkdirSync(config.configPath.base)
            // add the outout folder where webpack will publish the the html/css/js files
            if (config.configPath.output && !fs.existsSync(config.configPath.output)) fs.mkdirSync(config.configPath.output)

            // TODO we could use npm library front-mater to read the title of the exercises from the README.md
            config.exercises = getDirectories(config.configPath.exercisesPath).map((path, position) => exercise(path, position, config))
            this.save()
        },
        watchIndex: function(onChange=null){

          if(!config.configPath.exercisesPath) throw ValidationError("No exercises directory to watch")

          this.buildIndex()
          watch(config.configPath.exercisesPath)
            .then((eventname, filename) => {
              Console.debug("Changes detected on your exercises")
              this.buildIndex()
              if(onChange) onChange()
            })
            .catch(error => {
               throw error
            })
        },
        save: () => {

          // we don't want the user to be able to manipulate the configuration path
          //delete config.configPath
          //delete config.configPath.exercisesPath

          fs.writeFileSync(config.configPath.config, JSON.stringify(config, null, 4))
        }
    }
}