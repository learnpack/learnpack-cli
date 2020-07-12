const chalk = require("chalk")

module.exports = {
    _debug: false,//process.env.DEBUG == 'true',
    startDebug: function(){ this._debug = true; },
    log: (msg, ...args) => console.log(chalk.gray(msg), ...args),
    error: (msg, ...args) => console.log(chalk.red('⨉ '+msg), ...args),
    success: (msg, ...args) => console.log(chalk.green('✓ '+msg), ...args),
    info: (msg, ...args) => console.log(chalk.blue('ⓘ '+msg), ...args),
    debug(...args){
        this._debug && console.log(chalk.magentaBright(`⚠ debug: `), args)
    }
}