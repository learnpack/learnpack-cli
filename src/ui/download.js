const { prompt } = require("enquirer")
const Console = require('../utils/console')
const fetch = require('node-fetch')

const askPackage = () => new Promise(async (resolve, reject) => {
    Console.info(`No package was specified, downloading categories...`)
    const respLanguages = await fetch(`https://learnpack.herokuapp.com/v1/package/language`)
    const languages = await respLanguages.json()
    if(languages.length === 0){
        reject(new Error("No categories avaibale"))
        return null;
    } 
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
                    const error = new Error(`No packages found for language ${lang}`)
                    Console.error(error)
                    return error
                } 

                return await prompt([{
                    type: 'select',
                    name: 'pack',
                    message: 'Choose one of the packages available',
                    choices: packages.map(l => ({ message: l.title, name: l.slug })),
                }])
            })()
        })
        .then(resp => {
            if(!resp) reject(resp.message || resp)
            else resolve(resp.pack)
        })
        .catch(error => {
            Console.error(error.message || error)
        })
})
module.exports = { askPackage }