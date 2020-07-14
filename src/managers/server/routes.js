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
  
    // app.get('/readme', withHandler((req, res)=>{
    //     const readme = exercises.getExercise(req.params.slug).getReadme(req.query.lang || null)
    //     res.json(readme)
    // }))
  
    app.get('/exercise/:slug/readme', withHandler((req, res) => {
        const readme = exercises.getExercise(req.params.slug).getReadme(req.query.lang || null)
        res.json(readme)
    }))
  
    app.get('/exercise/:slug/report', withHandler((req, res) => {
        const report = exercises.getExercise(req.params.slug).getTestReport()
        res.json(JSON.stringify(report))
    }))
  
    app.get('/exercise/:slug', withHandler((req, res) => {
        const exercise = exercises.getExercise(req.params.slug)

        if(!exercise.graded) socket.removeAllowed("test")
        else socket.addAllowed('test')
        socket.log('ready')
  
        res.json(exercise)
    }))
  
    app.get('/exercise/:slug/file/:fileName', withHandler((req, res) => {
        res.write(exercises.getExercise(req.params.slug).getFile(req.params.fileName))
        res.end()
    }))
  
    const textBodyParser = bodyParser.text()
    app.put('/exercise/:slug/file/:fileName', textBodyParser, withHandler((req, res) => {
        const result = exercises.getExercise(req.params.slug).saveFile(req.params.fileName, req.body)
        res.end()
    }))
  
    if(config.configPath.output) app.use('/preview', express.static(config.configPath.output))
  
    app.use('/',express.static(config.configPath.base+'/_app'))
}