const p = require("path")
const frontMatter = require('front-matter')
const fs = require("fs")
let Console = require('../../utils/console');
let allowedExt = require('./allowed_extensions')

const exercise = (path, position, configObject) => {

    const { config, exercises } = configObject;
    let slug = p.basename(path)
    
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
        
        // if the slug is a dot, it means there is not "exercises" folder, and its just a single README.md
        if(slug == ".") slug = "default-index";
    
    const detected = detect(config, files);
    return {
        position, path, slug, translations, 
        language: detected.language,
        entry: detected.entry ? path + "/" + detected.entry : null, //full path to the exercise entry
        title: slug || "Exercise",
        graded: files.filter(file => file.toLowerCase().startsWith('test.') || file.toLowerCase().startsWith('tests.')).length > 0,
        files: filterFiles(files, path),
        //if the exercises was on the config before I may keep the status done
        done: (Array.isArray(exercises) && typeof exercises[position] !== 'undefined' && path.substring(path.indexOf('exercises/')+10) == exercises[position].slug) ? exercises[position].done : false,
        getReadme: function(lang=null){
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
            const file = this.files.find(f => f.name === name);
            if (!fs.existsSync(file.path)) throw Error('File not found: '+file.path)
            else if(fs.lstatSync(file.path).isDirectory()) return 'Error: This is not a file to be read, but a directory: '+file.path

            // get file content
            const content = fs.readFileSync(file.path)

            //create reset folder
            if (!fs.existsSync(`${config.dirPath}/resets`)) fs.mkdirSync(`${config.dirPath}/resets`)
            if (!fs.existsSync(`${config.dirPath}/resets/`+this.slug)){
                fs.mkdirSync(`${config.dirPath}/resets/`+this.slug)
                if (!fs.existsSync(`${config.dirPath}/resets/${this.slug}/${name}`)){
                    fs.writeFileSync(`${config.dirPath}/resets/${this.slug}/${name}`, content)
                }
            }

            return content
        },
        saveFile: function(name, content){
            const file = this.files.find(f => f.name === name);
            if (!fs.existsSync(file.path)) throw Error('File not found: '+file.path)
            return fs.writeFileSync(file.path, content, 'utf8')
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
    if(str = "./") return true;
    const regex = /^\d{2,3}(?:\.\d{1,2}?)?-[a-zA-z](?:-|_?[0-9a-zA-z]*)*$/
    return regex.test(str)
}

const isCodable = (str) => {
    const extension = p.extname(str);
    return allowedExt.includes(extension.substring(1).toLowerCase());
}

const shouldBeVisible = function(file){
    return (
        // doest not have "test." on their name
        (file.name.toLocaleLowerCase().indexOf('test.') == -1 && file.name.toLocaleLowerCase().indexOf('tests.') == -1 && file.name.toLocaleLowerCase().indexOf('.hide.') == -1 &&
        // ignore hidden files
        (file.name.charAt(0) != '.') &&
        // ignore learn.json and bc.json
        (file.name.toLocaleLowerCase().indexOf('learn.json') == -1) && (file.name.toLocaleLowerCase().indexOf('bc.json') == -1) &&
        // ignore images, videos, vectors, etc.
        isCodable(file.name) &&
        // readme's and directories
        !file.name.toLowerCase().includes("readme.") && !isDirectory(file.path) && file.name.charAt(0) != '_')
    );
}

const isDirectory = source => {
    //if(path.basename(source) === path.basename(config.dirPath)) return false
    return fs.lstatSync(source).isDirectory()
}

const detect = (config, files) => {

    if(!config.entries) throw Error("No configuration found for entries, please add a 'entries' object with the default file name for your exercise entry file that is going to be used while compiling, for example: index.html for html, app.py for python3, etc.")

    let hasFiles = files.filter(f => f.includes('.py'))
    if(hasFiles.length > 0) return {
        language: "python3",
        entry: hasFiles.find(f => config.entries["python3"] === f)
    }

    hasFiles = files.filter(f => f.includes('.java'))
    if(hasFiles.length > 0) return {
        language: "java",
        entry: hasFiles.find(f => config.entries["java"] === f)
    }

    const hasHTML = files.filter(f => f.includes('index.html'))
    const hasJS = files.filter(f => f.includes('.js'))
    // vanillajs needs to have at least 2 javascript files,
    // the test.js and the entry file in js
    // if not its just another HTML
    if(hasJS.length > 1 && hasHTML.length > 0) return {
        language: "vanillajs",
        entry: hasHTML.find(f => config.entries["vanillajs"] === f)
    }
    else if(hasHTML.length > 0) return {
        language: "html",
        entry: hasHTML.find(f => config.entries["html"] === f)
    }
    else if(hasJS.length > 0) return {
        language: "node",
        entry: hasJS.find(f => config.entries["node"] === f)
    }

    return {
        language: null,
        entry: null
    };
}

const filterFiles = (files, basePath=".") => files.map(ex => ({ 
    path: basePath+'/'+ex, 
    name: ex, 
    hidden: !shouldBeVisible({ name: ex, path: basePath+'/'+ex })
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
    });

module.exports = {
    exercise,
    detect,
    filterFiles
}