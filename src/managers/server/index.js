const express = require('express')
let Console = require('../../utils/console')
const addRoutes = require('./routes.js')
const cli = require("cli-ux").default

module.exports = async function(configObj, configManager){
    const { config } = configObj;
    var app = express()
    var server = require('http').Server(app)
    app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*")
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
        res.header("Access-Control-Allow-Methods", "GET,PUT")
        next()
    })

    // add all needed endpoints
    await addRoutes(app, configObj, configManager)

    server.listen( config.port, function () {
        Console.success(`Exercises are running 😃 Open your browser to start practicing!`)
        Console.success(`\n            Open the exercise on this link:`)
        if(config.editor.mode === 'gitpod') Console.log(`            https://${config.port}-${config.address.substring(8)}`)
        else{
            Console.log(`            ${config.address}:${config.port}`)
            cli.open(`${config.address}:${config.port}`)
        }
      })

    return server
}
