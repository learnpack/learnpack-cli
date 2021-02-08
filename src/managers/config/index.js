const path = require('path')
const fs = require('fs')
let shell = require('shelljs')
let Console = require('../../utils/console')
let watch = require('../../utils/watcher')
const Gitpod = require('../gitpod')
const fetch = require('node-fetch');
const { ValidationError, NotFoundError, InternalError } = require('../../utils/errors.js')

let defaults = require('./defaults.js')
let { exercise } = require('./exercise.js')

const { rmSync } = require('../file.js')
/* exercise folder name standard */


const getConfigPath = () => {
  const possibleFileNames = ['learn.json', '.learn/learn.json','bc.json','.breathecode/bc.json']
  let config = possibleFileNames.find(file => fs.existsSync(file)) || null
  if(config && fs.existsSync(".breathecode")) return { config, base: ".breathecode" }
  else if(config === null) throw NotFoundError("learn.json file not found on current folder, is this a learnpack package?")
  return { config, base: ".learn" }
}

const getExercisesPath = (base) => {
  const possibleFileNames = ['./exercises',base+'/exercises','./']
  return possibleFileNames.find(file => fs.existsSync(file)) || null
}

module.exports = async ({ grading, editor, disableGrading, version }) => {

    let confPath = getConfigPath()
    Console.debug("This is the config path: ", confPath)

    let configObj = {}
    if (confPath){
      const bcContent = fs.readFileSync(confPath.config)

      let hiddenBcContent = {}
      if(fs.existsSync(confPath.base+"/config.json")){
        hiddenBcContent = fs.readFileSync(confPath.base+"/config.json")
        hiddenBcContent = JSON.parse(hiddenBcContent)
        if(!hiddenBcContent) throw Error(`Invalid ${confPath.base}/config.json syntax: Unable to parse.`)
      }

      const jsonConfig = JSON.parse(bcContent)
      if(!jsonConfig) throw Error(`Invalid ${confPath.config} syntax: Unable to parse.`)

      //add using id to the installation
      if(!jsonConfig.session) jsonConfig.session = Math.floor(Math.random() * 10000000000000000000)

      configObj = deepMerge(hiddenBcContent, jsonConfig,{ config: { disableGrading } })
      Console.debug("Content form the configuration .json ",configObj)
    }
    else{
      throw ValidationError("No learn.json file has been found, make sure you are in the folder")
    }

    configObj = deepMerge(defaults || {}, configObj, { config: { grading: grading || configObj.grading, configPath: confPath.config } })
    configObj.config.outputPath = confPath.base+"/dist"


    Console.debug("This is your configuration object: ", { ...configObj, exercises: configObj.exercises ? configObj.exercises.map(e => e.slug) : [] })

    // Assign default editor mode if not set already
    if(configObj.config.editor.mode == null){
      configObj.config.editor.mode = shell.which('gp') ? configObj.config.editor.mode = "gitpod" : "standalone"
    }

    if(configObj.config.editor.mode === "gitpod") Gitpod.setup(configObj.config)

    if(version) configObj.config.editor.version = version;
    else if(configObj.config.editor.version === null){
      const resp = await fetch('https://raw.githubusercontent.com/learnpack/coding-ide/learnpack/package.json');
      const packageJSON = await resp.json()
      configObj.config.editor.version = packageJSON.version || "1.0.0";
    }

    configObj.config.dirPath = "./" + confPath.base
    configObj.config.exercisesPath = getExercisesPath(confPath.base) || "./"

    return {
        get: () => configObj,
        clean: () => {

          const ignore = ['config', 'exercises', "session"]

          rmSync(configObj.config.outputPath);
          rmSync(configObj.config.dirPath+"/_app");

          // clean tag gz
          if (fs.existsSync(configObj.config.dirPath+"/app.tar.gz"))
            fs.unlinkSync(configObj.config.dirPath+"/app.tar.gz");

          // clean configuration object
          let _new = {}
          Object.keys(configObj).forEach(key => {
            if(!ignore.includes(key)) _new[key] = configObj[key]
          })

          fs.writeFileSync(configObj.config.configPath, JSON.stringify(_new, null, 4))
        },
        getExercise: (slug) => {
          const exercise = configObj.exercises.find(ex => ex.slug == slug)
          if(!exercise) throw ValidationError(`Exercise ${slug} not found`)

          return exercise
        },
        reset: (slug) => {

          if (!fs.existsSync(`${configObj.config.dirPath}/resets/`+slug)) throw ValidationError("Could not find the original files for "+slug)

          const exercise = configObj.exercises.find(ex => ex.slug == slug)
          if(!exercise) throw ValidationError(`Exercise ${slug} not found on the configuration`)

          fs.readdirSync(`${configObj.config.dirPath}/resets/${slug}/`)
            .forEach(fileName => {
              const content = fs.readFileSync(`${configObj.config.dirPath}/resets/${slug}/${fileName}`)
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

            // TODO: we could use npm library front-mater to read the title of the exercises from the README.md
            const grupedByDirectory = getDirectories(configObj.config.exercisesPath);
            if(grupedByDirectory.length > 0) configObj.exercises = grupedByDirectory.map((path, position) => exercise(path, position, configObj));
            // else means the exercises are not in a folder
            else configObj.exercises = [exercise(configObj.config.exercisesPath, 0, configObj)]
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
        save: (config=null) => {

          //remove the duplicates form the actions array
          configObj.config.actions = [...new Set(configObj.config.actions)];
          configObj.config.translations = [...new Set(configObj.config.translations)];
          
          fs.writeFileSync(configObj.config.dirPath+"/config.json", JSON.stringify(configObj, null, 4))
        }
    }
}

function deepMerge(...sources) {
  let acc = {}
  for (const source of sources) {
    if (source instanceof Array) {
      if (!(acc instanceof Array)) {
        acc = []
      }
      acc = [...source]
    } else if (source instanceof Object) {
      for (let [key, value] of Object.entries(source)) {
        if (value instanceof Object && key in acc) {
          value = deepMerge(acc[key], value)
        }
        if(value != undefined) acc = { ...acc, [key]: value }
      }
    }
  }
  return acc
}
