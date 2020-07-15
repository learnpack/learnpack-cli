const { prompt } = require("enquirer")
const Console = require('../utils/console')
const fetch = require('node-fetch')

const askPackage = () => new Promise(async (resolve, reject) => {
    Console.info(`No package was specified, downloading categories...`)
    const respLanguages = await fetch(`https://learnpack.herokuapp.com/v1/package/language`)
    const languages = await respLanguages.json()
    let packages = []
    prompt([{
            type: 'select',
            name: 'lang',
            message: 'What language do you want to practice?',
            choices: languages.map(l => ({ message: l.title, name: l.slug })),
        }])
        .then(({ lang }) => {
            return (async() => {
                const r = await fetch(`https://learnpack.herokuapp.com/v1/package/?language=${lang}`)
                const packages = await r.json()
                if(packages.length === 0){
                    Console.error(`No packages found for language ${lang}`)
                    return null
                } 

                return await prompt([{
                    type: 'select',
                    name: 'pack',
                    message: 'Choose one of the packages available',
                    choices: packages.map(l => ({ message: l.title, name: l.slug })),
                }])
            })()
        })
        .then(({ pack }) => {
            resolve(pack)
        })
        .catch(error => Console.error(error.message || error))
})
module.exports = { askPackage }