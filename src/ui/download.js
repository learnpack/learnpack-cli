const { prompt } = require("enquirer")
const Console = require('../utils/console')
const api = require('../utils/api')
const fetch = require('node-fetch')

const askPackage = () => new Promise(async (resolve, reject) => {
    Console.info(`No package was specified`)
    const languages = await api.getLangs()
    if(languages.length === 0){
        reject(new Error("No categories available"))
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
                const response = await api.getAllPackages({ lang })
                const packages = response.results
                if(packages.length === 0){
                    const error = new Error(`No packages found for language ${lang}`)
                    Console.error(error)
                    return error
                }
                return await prompt([{
                    type: 'select',
                    name: 'pack',
                    message: 'Choose one of the packages available',
                    choices: packages.map(l => ({ 
                        message: `${l.title}, difficulty: ${l.difficulty}, downloads: ${l.downloads} ${l.skills.length > 0 ? `(Skills: ${l.skills.join(",")})` : ""}`, 
                        value: l
                    })),
                }])
            })()
        })
        .then(resp => {
            if(!resp) reject(resp.message || resp)
            else resolve(resp)
        })
        .catch(error => {
            Console.error(error.message || error)
        })
})
module.exports = { askPackage }
