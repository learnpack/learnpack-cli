const Console = require('../../utils/console')
const express = require('express')
const fs = require('fs')
const bodyParser = require('body-parser')
const socket = require('../socket.js');
const queue = require("../../utils/fileQueue")
const { detect, filterFiles } = require("../config/exercise");

const withHandler = (func) => (req, res) => {
    try{
      func(req, res)
    }
    catch(err){
      Console.debug(err)
      const _err = {
        message: err.message || 'There has been an error' ,
        status: err.status || 500,
        type: err.type || null
      }
      Console.error(_err.message)

      //send rep to the server
      res.status(_err.status)
      res.json(_err)
    }
}

module.exports = async function(app, configObject, configManager){

    const { config } = configObject;
    const dispatcher = queue.dispatcher({ create: true, path: `${config.dirPath}/vscode_queue.json` })

    app.get('/config', withHandler((req, res)=>{
        res.json(configObject)
    }))

    /**
     * TODO: replicate a socket action, the request payload must be passed to the socket as well
     */
    const jsonBodyParser = bodyParser.json()
    app.post('/socket/:actionName', jsonBodyParser, withHandler((req, res)=>{
        if(socket[req.params.actionName] instanceof Function){
            socket[req.params.actionName](req.body ? req.body.data : null)
            res.json({ "details": "Socket call executed sucessfully"})
        }else res.status(400).json({ "details": `Socket action ${req.params.actionName} not found`})
    }))

    //symbolic link to maintain path compatiblity
    app.get('/assets/:filePath', withHandler((req, res) => {
        let filePath = `${config.dirPath}/assets/${req.params.filePath}`
        if (!fs.existsSync(filePath)) throw Error('File not found: '+filePath)
        const content = fs.readFileSync(filePath)
        res.write(content);
        res.end();
    }));

    app.get('/exercise', withHandler((req, res) => {
        res.json(configObject.exercises)
    }))

    app.get('/exercise/:slug/readme', withHandler((req, res) => {
        const readme = configManager.getExercise(req.params.slug).getReadme(req.query.lang || null)
        res.json(readme)
    }))

    app.get('/exercise/:slug/report', withHandler((req, res) => {
        const report = configManager.getExercise(req.params.slug).getTestReport()
        res.json(JSON.stringify(report))
    }))

    app.get('/exercise/:slug', withHandler((req, res) => {

        // no need to re-start exercise if it's already started
        if(configObject.currentExercise && req.params.slug === configObject.currentExercise){
            let exercise = configManager.getExercise(req.params.slug)
            res.json(exercise)
            return;
        }

        let exercise = configManager.startExercise(req.params.slug)
        dispatcher.enqueue(dispatcher.events.START_EXERCISE, req.params.slug)
        
        // if we are in incremental grading, the entry file can by dinamically detected
        // based on the changes the student is making during the exercise
        if(config.grading === "incremental"){
            const entries = Object.keys(config.entries).map(lang => config.entries[lang]);
            const scanedFiles = fs.readdirSync(`./`);
            const onlyEntries = scanedFiles.filter(fileName => entries.includes(fileName));
            const detected = detect(config, onlyEntries);

            // update the file hierarchy with updates
            exercise.files = exercise.files.filter(f => f.name.includes("test.")).concat(filterFiles(scanedFiles))
            Console.debug(`Exercise updated files: `, exercise.files)
            //if a new language for the testing engine is detected, we replace it
            // if not we leave it as it was before
            if(detected.language){
                Console.debug(`Switching to ${detected.language} engine in this exercise`)
                exercise.language = detected.language;
            } 

            // WARNING: has to be the FULL PATH to the entry path
            exercise.entry = detected.entry;
            Console.debug(`Exercise detected entry: ${detected.entry}`)
        }

        if(!exercise.graded || config.disableGrading) socket.removeAllowed("test")
        else socket.addAllowed('test')

        if(!exercise.entry){
            socket.removeAllowed("build")
            Console.error(`No entry was found for this exercise ${req.params.slug}, looking for the following entries from the config: `)
            Console.log(config.entries)
        }
        else socket.addAllowed('build')

        if(exercise.files.filter(f => !f.name.toLowerCase().includes("readme.") && !f.name.toLowerCase().includes("test.")).length === 0) socket.removeAllowed("reset")
        else socket.addAllowed('reset')

        socket.log('ready')

        res.json(exercise)
    }))

    app.get('/exercise/:slug/file/:fileName', withHandler((req, res) => {
        res.write(configManager.getExercise(req.params.slug).getFile(req.params.fileName))
        res.end()
    }))

    const textBodyParser = bodyParser.text()
    app.put('/exercise/:slug/file/:fileName', textBodyParser, withHandler((req, res) => {
        const result = configManager.getExercise(req.params.slug).saveFile(req.params.fileName, req.body)
        res.end()
    }))

    if(config.outputPath) app.use('/preview', express.static(config.outputPath))

    app.use('/',express.static(config.dirPath+'/_app'))
}
