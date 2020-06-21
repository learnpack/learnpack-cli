var express = require('express')
const addRoutes = require('./routes.js')


module.exports = async function(config){
    var app = express()
    var server = require('http').Server(app)
    app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*")
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
        res.header("Access-Control-Allow-Methods", "GET,PUT")
        next()
    })

    await addRoutes(app)

    server.listen( config.port, function () {
        Console.success(`Exercises are running 😃 Open your browser to start practicing!`)
        Console.success(`\n            Here is your exercises link:`)
        if(config.editor === 'gitpod') Console.log(`            https://${config.port}-${config.address.substring(8)}`)
        else Console.log(`            ${config.address}:${config.port}`)
      })

    return server
}