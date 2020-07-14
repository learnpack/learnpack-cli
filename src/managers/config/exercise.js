const path = require('path')
const fs = require("fs")
const file = require("../file")


module.exports = (path, position, config) => {

    const found = path.indexOf(config.configPath.exercisesPath) > -1
    const slug = found ? path.substring(path.indexOf(config.configPath.exercisesPath)+config.configPath.exercisesPath.length) : path

    if(!validateExerciseDirectoryName(slug)){
        Console.error('Exercise directory "'+slug+'" has an invalid name, it has to start with two or three digits followed by words separated by underscors or hyphen (no white spaces). e.g: 01.12-hello-world')
        Console.help('Verify that the folder "'+slug+'" starts with a number and it does not contain white spaces or weird characters.')
        throw Error('Error building the exercise index')
    }
    
    // get all the files
    const files = fs.readdirSync(path)
    
    /**
     * build the translation array like:
        {
            "us": "path/to/Readme.md",
            "es": "path/to/Readme.es.md"
        }
     */
    var translations = {}
    files.filter(file => file.toLowerCase().includes('readme')).forEach(file => {
        const parts = file.split('.')
        if(parts.length === 3) translations[parts[1]] = file
        else translations["us"] = file
    })

    // get the coding language

    return {
        position, path, slug, translations, 
        language: getLanguage(files),
        title: slug,
        graded: files.filter(file => file.toLowerCase().startsWith('test.') || file.toLowerCase().startsWith('tests.')).length > 0,
        files: files.map(ex => ({ 
            path: path+'/'+ex, 
            name: ex, 
            hidden: shouldBeVisible({ name: ex, path: path+'/'+ex })
        }))
            .sort((f1, f2) => {
                const score = { // sorting priority
                "index.html": 1,
                "styles.css": 2,
                "styles.scss": 2,
                "style.css": 2,
                "style.scss": 2,
                "index.css": 2,
                "index.scss": 2,
                "index.js": 3,
                }
                return score[f1.name] < score[f2.name] ? -1 : 1
            }),
        //if the exercises was on the config before I may keep the status done
        done: (Array.isArray(config.exercises) && typeof config.exercises[position] !== 'undefined' && path.substring(path.indexOf('exercises/')+10) == config.exercises[position].slug) ? config.exercises[position].done : false,
        getReadme: function({ lang=null }){
          
            if(lang == 'us') lang = null // <-- english is default, no need to append it to the file name
            if (!fs.existsSync(`${this.path}/README${lang ? "."+lang : ''}.md`)){
                Console.error(`Language ${lang} not found for exercise ${slug}, switching to default language`)
                if(lang) lang = null
                if (!fs.existsSync(`${this.path}/README${lang ? "."+lang : ''}.md`)) throw Error('Readme file not found for exercise: '+this.path+'/README.md')
            }
            const content = fs.readFileSync(`${this.path}/README${lang ? "."+lang : ''}.md`,"utf8")
            const attr = frontMatter(content)
            return attr
        },
        getFile: function(name){
            if (!fs.existsSync(this.path+'/'+name)) throw Error('File not found: '+this.path+'/'+name)
            else if(fs.lstatSync(this.path+'/'+name).isDirectory()) return 'Error: This is not a file to be read, but a directory: '+this.path+'/'+name

            // get file content
            const content = fs.readFileSync(this.path+'/'+name)

            //create reset folder
            if (!fs.existsSync(`${config.configPath.base}/resets`)) fs.mkdirSync(`${config.configPath.base}/resets`)
            if (!fs.existsSync(`${config.configPath.base}/resets/`+this.slug)){
                fs.mkdirSync(`${config.configPath.base}/resets/`+this.slug)
                if (!fs.existsSync(`${config.configPath.base}/resets/${this.slug}/${name}`)){
                    fs.writeFileSync(`${config.configPath.base}/resets/${this.slug}/${name}`, content)
                }
            }

            return content
        },
        saveFile: (name, content) => {
            if (!fs.existsSync(this.path+'/'+name)) throw Error('File not found: '+this.path+'/'+name)
            return fs.writeFileSync(this.path+'/'+name, content, 'utf8')
        },
        getTestReport: function(){
            const _path = `${config.confPath.base}/reports/${this.slug}.json`
            if (!fs.existsSync(_path)) return {}
  
            const content = fs.readFileSync(_path)
            const data = JSON.parse(content)
            return data
        },
    }
}

const validateExerciseDirectoryName = (str) => {
    const regex = /^\d{2,3}(?:\.\d{1,2}?)?-[a-zA-z](?:-|_?[0-9a-zA-z]*)*$/
    return regex.test(str)
}

const shouldBeVisible = function(file){
    return (
        // ignore tests files and files with ".hide" on their name
        (file.name.toLocaleLowerCase().indexOf('test.') == -1 && file.name.toLocaleLowerCase().indexOf('tests.') == -1 && file.name.toLocaleLowerCase().indexOf('.hide.') == -1 &&
        // ignore java compiled files
        (file.name.toLocaleLowerCase().indexOf('.class') == -1) &&
        // readmes and directories
        !file.name.toLowerCase().includes("readme.") && !isDirectory(file.path) && file.name.indexOf('_') != 0)
    );
}

const isDirectory = source => {
    //if(path.basename(source) === path.basename(config.dirPath)) return false
    return fs.lstatSync(source).isDirectory()
}

const getLanguage = (files) => {
    const hasPython = files.find(f => f.includes('.py'))
    if(hasPython) return "python3"
    const hasJava = files.find(f => f.includes('.java'))
    if(hasJava) return "java"
    const hasHTML = files.find(f => f.includes('index.html'))
    const hasJS = files.find(f => f.includes('.js'))
    if(hasJS && hasHTML) return "vanillajs"
    else if(hasHTML) return "html"
    else return "node"
}