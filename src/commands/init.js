const {flags} = require('@oclif/command')
const BaseCommand = require('../utils/BaseCommand')

const fs = require('fs')
const prompts = require('prompts')
const cli = require("cli-ux").default
const eta = require("eta")

const Console = require('../utils/console')
const { ValidationError } = require('../utils/errors')
let defaults = require('../managers/config/defaults.js')

const path = require('path')

class InitComand extends BaseCommand {
  async run() {
    const {flags} = this.parse(InitComand)

    Console.log(Object.getOwnPropertyNames(this))

    let choices = await prompts([
        {
          type: 'select',
          name: 'grading',
          message: 'Is the auto-grading going to be isolated or incremental?',
          choices: [
            { title: 'Incremental: Build on top of each other like a tutorial', value: 'incremental' },
            { title: 'Isolated: Small separated exercises', value: 'isolated' },
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

    fs.readdir('./', function(err, files) {
        files = files.filter(f => f !== '.node-persist' && f !== '.git')
        if (err) {
          throw ValidationError(err.message)
        } else {

          if (!files.length) {
              const templatesDir = "../utils/templates"
              fs.writeFileSync('./learn.json', JSON.stringify(packageInfo, null, 2))

              fs.writeFileSync('./README.md', eta.render(fs.readFileSync(path.resolve(__dirname,`${templatesDir}/README.ejs`),'utf-8'), packageInfo))

              cli.action.stop()                
              Console.success(`😋 Package initialized successfully`)

              return true
            }

            cli.action.stop()
            throw ValidationError(`The directory must be empty in order to start creating the exercises: ${files.join(',')}`)
        }
    })
  }
}

InitComand.description = 'Create a new learning package: Book, Tutorial or Exercise'
InitComand.flags = {
  ...BaseCommand.flags,
  grading: flags.help({char:'h'}),
}
module.exports = InitComand