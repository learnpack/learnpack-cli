const chalk = require("chalk")

module.exports = {
    _debug: process.env.DEBUG == 'true',
    startDebug: function(){ this._debug = true; },
    error: (msg) => console.log(chalk.red(msg)),
    success: (msg) => console.log(chalk.green(msg)),
    debug(...args){
        this._debug && console.log(chalk.magentaBright(`⚠ debug: `), args)
    }
}