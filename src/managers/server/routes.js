const Console = require('../../utils/console')
const express = require('express')
const bodyParser = require('body-parser')
const socket = require('../socket.js');

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

module.exports = async function(app, config, exercises){

    app.get('/config', withHandler((req, res)=>{
        res.json(config)
    }))
  
    app.get('/exercise', withHandler((req, res) => {
        res.json(config.exercises)
    }))
  
    app.get('/readme', withHandler((req, res)=>{
        const readme = exercises.getReadme({ lang: req.query.lang || null, slug: null })
        res.json(readme)
    }))
  
    app.get('/exercise/:slug/readme', withHandler((req, res) => {
        console.log("asdasdasda")
        const readme = exercises.getReadme({ lang: req.query.lang || null, slug: req.params.slug })
        res.json(readme)
    }))
  
    app.get('/exercise/:slug/report', withHandler((req, res) => {
        const report = exercises.getTestReport(req.params.slug)
        res.json(JSON.stringify(report))
    }))
  
    app.get('/exercise/:slug', withHandler((req, res) => {
        const details = exercises.getExerciseDetails(req.params.slug)
  
        if(!details.exercise.graded) socket.removeAllowed("test")
        else socket.addAllowed('test')
        socket.log('ready')
  
        res.json(details)
    }))
  
    app.get('/exercise/:slug/file/:fileName', withHandler((req, res) => {
        res.write(exercises.getFile(req.params.slug, req.params.fileName))
        res.end()
    }))
  
    app.get('/assets/:fileName', withHandler((req, res) => {
        res.write(exercises.getAsset(req.params.fileName))
        res.end()
    }))
  
    const textBodyParser = bodyParser.text()
    app.put('/exercise/:slug/file/:fileName', textBodyParser, withHandler((req, res) => {
        const result = exercises.saveFile(req.params.slug, req.params.fileName, req.body)
        res.end()
    }))
  
    if(config.configPath.output) app.use('/preview', express.static(config.configPath.output))
  
    app.use('/',express.static(config.configPath.base+'/_app'))
}