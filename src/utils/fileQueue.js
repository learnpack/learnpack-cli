const logger = require('../utils/console')
const fs = require("fs")
const em = require('events')
const XXH = require('xxhashjs')

// possible events to dispatch
let events = {
    START_EXERCISE: "start_exercise",
    RESET_EXERCISE: "reset_exercise",
    INIT: "initializing",
    RUNNING: "configuration_loaded",
    END: "connection_ended",
    OPEN_FILES: "open_files",
    OPEN_WINDOW: "open_window",
    INSTRUCTIONS_CLOSED: "instructions_closed"
}

let options = {
    path: null,
    create: false
}
let lastHash = null
let watcher = null // subscribe to file and listen to changes
let actions = null // action queue

const loadDispatcher = (opts) => {

    actions = [{ name: "initializing", time: now() }]
    logger.debug(`Loading from ${opts.path}`)
    
    let exists = fs.existsSync(opts.path);
    if(opts.create){
        if(exists) actions.push({ name: "reset", time: now() })
        fs.writeFileSync(opts.path, JSON.stringify(actions), { flag: "w"})
        exists = true
    }
    
    if(!exists) throw Error(`Invalid queue path, missing file at: ${opts.path}`)

    let incomingActions = []
    try{
        const content = fs.readFileSync(opts.path, 'utf-8')
        incomingActions = JSON.parse(content)
        if(!Array.isArray(incomingActions)) incomingActions = []
    }
    catch(error){
        incomingActions = []
        logger.debug(`Error loading VSCode Actions file`)
    }

    logger.debug(`Actions load `, incomingActions)
    return incomingActions
}


const enqueue = (name, data) => {
    
    if(!Object.values(events).includes(name)){
        logger.debug(`Invalid event ${name}`)
        throw Error(`Invalid action ${name}`)
    }
    
    if(!actions) actions = []
    
    actions.push({ name, time: now(), data: data })
    logger.debug(`EMIT -> ${name}:Exporting changes to ${options.path}`)
    
    return fs.writeFileSync(options.path, JSON.stringify(actions)) 
}
const now = () => {
    const hrTime = process.hrtime()
    return hrTime[0] * 1000000 + hrTime[1] / 1000
}
const loadFile = (filePath) => {
    const content = fs.readFileSync(filePath, 'utf8')
    const newHash = XXH.h32( content, 0xABCD ).toString(16);
    const isUpdated = lastHash != newHash
    lastHash = newHash
    const incomingActions = JSON.parse(content)
    return { isUpdated, incomingActions }
}

const dequeue = () => {

    // first time dequeue loads
    if(!actions) actions = []
    
    const { isUpdated, incomingActions } = loadFile(options.path, 'utf8')

    if(!isUpdated && actions.length === incomingActions.length){
        logger.debug(`No new actions to process: ${actions.length}/${incomingActions.length}`)
        return null
    }

    // do i need to reset actions to zero?
    if(actions.length > 0 && actions[0].time != incomingActions[0].time){
        actions = []
    } 

    let action = incomingActions[actions.length]
    logger.debug("Dequeing action ", action)
    actions.push(action)
    return action
}

const pull = (callback) => {
    logger.debug("Pulling actions")
    let incoming = dequeue()
    while(incoming){
        callback(incoming)
        incoming = dequeue()
    }
}

const reset = (callback) => {
    logger.debug("Queue reseted")
    actions = []
    const success = fs.writeFileSync(options.path, "[]") 
    if(success) callback()
}

const onPull = (callback) => {

    const chokidar = require('chokidar')

    logger.debug("Starting to listen...")

    if(!watcher){
        logger.debug(`Watching ${options.path}`)
        watcher = chokidar.watch(`${options.path}`, {
            persistent: true
        })
    }
    else logger.debug("Already watching queue path")

    watcher
        .on('add', path => pull(callback))
        .on('change', path => pull(callback))

    return true
}

const onReset = (callback) => {

    const chokidar = require('chokidar')

    if(!watcher){
        logger.debug(`Watching ${options.path}`)
        watcher = chokidar.watch(`${options.path}`, {
            persistent: true
        })
    }

    watcher.on('unlink', path => reset(callback))

    return true
}


module.exports = { 
    events,
    dispatcher: (opts = {}) => {
        if(!actions){
            options = { ...options, ...opts }
            logger.debug("Initializing queue dispatcher", options)
            actions = loadDispatcher(options)
        }
        return { enqueue, events }
    },
    listener: (opts = {}) => {
        if(!actions){
            options = { ...options, ...opts }
            logger.debug("Initializing queue listener", options)
        }
        return { onPull, onReset, events }
    } 
}