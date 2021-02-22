const {flags} = require('@oclif/command')
const BaseCommand = require('../utils/BaseCommand')

const fs = require('fs-extra')
const prompts = require('prompts')
const cli = require("cli-ux").default
const eta = require("eta")

const Console = require('../utils/console')
const { ValidationError } = require('../utils/errors')
let defaults = require('../managers/config/defaults.js')

const path = require('path')
const { resolve } = require('path')

class InitComand extends BaseCommand {
  async run() {
    const {flags} = this.parse(InitComand)

    try{
      // if the folder/file .learn or .breathecode aleady exists
      await alreadyInitialized();
    }
    catch(error){
      Console.error(error.message)
      return false
    }

    let choices = await prompts([
        {
          type: 'select',
          name: 'grading',
          message: 'Is the auto-grading going to be isolated or incremental?',
          choices: [
            { title: 'Incremental: Build on top of each other like a tutorial', value: 'incremental' },
            { title: 'Isolated: Small isolated exercises', value: 'isolated' },
            { title: 'No grading: No feedback or testing whatsoever', value: null },
          ],
        },{
          type: 'text',
          name: 'title',
          initial: 'My Interactive Tutorial',
          message: 'Title for your tutorial? Press enter to leave as it is'
        },{
          type: 'text',
          name: 'description',
          initial: '',
          message: 'Description for your tutorial? Press enter to leave blank'
        },{
          type: 'select',
          name: 'difficulty',
          message: 'How difficulty will be to complete the tutorial?',
          choices: [
            { title: 'Begginer (no previous experience)', value: 'beginner' },
            { title: 'Easy (just a bit of experience required)', value: 'easy' },
            { title: 'Intermediate (you need experience)', value: 'intermediate' },
            { title: 'Hard (master the topic)', value: 'hard' },
          ],
        },{
          type: 'text',
          name: 'duration',
          initial: "1",
          message: 'How many hours avg it takes to complete (number)?',
          validate: value => {
            var n = Math.floor(Number(value))
            return n !== Infinity && String(n) === value && n >= 0
          }
        }
    ])

    const packageInfo = {
      ...defaults.config,
      grading: choices.grading,
      difficulty: choices.difficulty,
      duration: parseInt(choices.duration),
      description: choices.description,
      title: choices.title,
      slug: choices.title.toLowerCase().replace(/ /g,'-').replace(/[^\w-]+/g,'')
    }

    cli.action.start('Initializing package')

    
    try{
      const templatesDir = path.resolve(__dirname,"../utils/templates/"+choices.grading || "no-grading")
      if(!fs.existsSync(templatesDir)) throw ValidationError(`Template ${templatesDir} does not exists`)
      await fs.copySync(templatesDir, './')
      fs.writeFileSync('./README.md', eta.render(fs.readFileSync(path.resolve(__dirname,`${templatesDir}/README.ejs`),'utf-8'), packageInfo))
      if(fs.existsSync('./README.ejs') && !fs.existsSync('./README.md')) fs.removeSync('./README.ejs')
      if(!fs.existsSync('./.gitignore')) fs.copyFile(path.resolve(__dirname,'../utils/templates/gitignore.txt'), './.gitignore')
      fs.writeFileSync('./learn.json', JSON.stringify(packageInfo, null, 2))
    }
    catch(error){
      Console.error(error.message || error)
      return false
    }

    cli.action.stop()                
    Console.success(`😋 Package initialized successfully`)
    Console.help(`Start the exercises by running the following command on your terminal: $ learnpack start`)

  }
}

InitComand.description = 'Create a new learning package: Book, Tutorial or Exercise'
InitComand.flags = {
  ...BaseCommand.flags,
  grading: flags.help({char:'h'}),
}

const alreadyInitialized = () => new Promise((resolve, reject) => {
  fs.readdir('./', function(err, files) {
    files = files.filter(f => ['.learn', 'learn.json', 'bc.json', '.breathecode', '.gitignore'].includes(f))
    if (err) {
      reject(ValidationError(err.message))
      return true
    } else if (files.length > 0){
      reject(ValidationError("It seems the package is already initialized because we've found the following files: "+files.join(',')))
      return true
    } 

    resolve(false)
  })
})

module.exports = InitComand