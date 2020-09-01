const path = require('path')
const fs = require('fs')
let shell = require('shelljs')
let Console = require('../../utils/console')
let watch = require('../../utils/watcher')
const Gitpod = require('../gitpod')
const { ValidationError, NotFoundError } = require('../../utils/errors.js')

let defaults = require('./defaults.js')
let exercise = require('./exercise.js')
const merge = require('deepmerge')
/* exercise folder name standard */


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

    let configObj = {}
    if (confPath){
      const bcContent = fs.readFileSync(confPath.config)
      const jsonConfig = JSON.parse(bcContent)
      if(!jsonConfig) throw Error(`Invalid ${confPath.config} syntax: Unable to parse.`)

      //add using id to the installation
      if(!jsonConfig.session) jsonConfig.session = Math.floor(Math.random() * 10000000000000000000)

      configObj = merge(jsonConfig,{ config: { disableGrading } })
      Console.debug("Content form the configuration .json ",configObj)
    }
    else{
      throw ValidationError("No learn.json file has been found, make sure you are in the folder")
    }

    configObj = merge.all([ defaults || {}, configObj, { config: { grading: grading || configObj.grading, configPath: confPath.config } }], {
      arrayMerge: (destinationArray, sourceArray, options) => sourceArray
    })
    configObj.config.outputPath = confPath.base+"/dist"
    
    Console.debug("This is your configuration object: ", { ...configObj, exercises: configObj.exercises ? configObj.exercises.map(e => e.slug) : [] })
    
    // Assign default editor mode if not set already
    if(configObj.config.editor.mode == null){
      configObj.config.editor.mode = shell.which('gp') ? configObj.config.editor.mode = "gitpod" : "standalone"
    }
    
    if(configObj.config.editor.mode === "gitpod") Gitpod.setup(configObj.config)

    if (configObj.config.grading === 'isolated' && !configObj.config.exercisesPath){
      configObj.config.exercisesPath = getExercisesPath(confPath.base)
      if(!configObj.config.exercisesPath) throw Error(`You are running with ${configObj.config.grading} grading, so make sure you have "exercises" folder or "exercisesPath" property on the configuration file`)
    }
    else{
      if(!fs.existsSync(configObj.config.exercisesPath)) throw Error(`You are running with ${configObj.config.grading} grading but your configured exercisesPath folder does not exist: ${configObj.config.exercisesPath}`)
    }

    return {
        get: () => configObj,
        getExercise: (slug) => {
          const exercise = configObj.exercises.find(ex => ex.slug == slug)
          if(!exercise) throw ValidationError(`Exercise ${slug} not found`)

          return exercise
        },
        reset: (slug) => {
          if (!fs.existsSync(`${configObj.config.configPath.base}/resets/`+slug)) throw new Error("Could not find the original files for "+slug)

          const exercise = configObj.exercises.find(ex => ex.slug == slug)
          if(!exercise) throw new ValidationError(`Exercise ${slug} not found on the configuration`)

          fs.readdirSync(`${configObj.config.configPath.base}/resets/${slug}/`)
            .forEach(fileName => {
              const content = fs.readFileSync(`${configObj.config.configPath.base}/resets/${slug}/${fileName}`)
              fs.writeFileSync(`${exercise.path}/${fileName}`, content)
            })
        },
        buildIndex: function(){
            Console.info("Building the exercise index...")

            const isDirectory = source => {
              const name = path.basename(source)
              if(name === path.basename(configObj.config.dirPath)) return false
              //ignore folders that start with a dot
              if(name.charAt(0) === "." || name.charAt(0) === "_") return false;

              return fs.lstatSync(source).isDirectory()
            }
            const getDirectories = source => fs.readdirSync(source).map(name => path.join(source, name)).filter(isDirectory)
            // add the .learn folder
            if (!fs.existsSync(confPath.base)) fs.mkdirSync(confPath.base)
            // add the outout folder where webpack will publish the the html/css/js files
            if (configObj.config.outputPath && !fs.existsSync(configObj.config.outputPath)) fs.mkdirSync(configObj.config.outputPath)

            // TODO we could use npm library front-mater to read the title of the exercises from the README.md
            configObj.exercises = getDirectories(configObj.config.exercisesPath).map((path, position) => exercise(path, position, configObj.config))
            this.save()
        },
        watchIndex: function(onChange=null){

          if(!configObj.config.exercisesPath) throw ValidationError("No exercises directory to watch: "+configObj.config.exercisesPath)

          this.buildIndex()
          watch(configObj.config.exercisesPath)
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

          fs.writeFileSync(configObj.config.configPath, JSON.stringify(configObj, null, 4))
        }
    }
}