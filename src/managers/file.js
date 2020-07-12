var fs = require('fs')
var targz = require('targz')
let Console = require('../utils/console')
var https = require('https')

const decompress = (sourcePath, destinationPath) => new Promise((resolve, reject) => {
    Console.debug("Decompressing "+sourcePath)
    targz.decompress({
        src: sourcePath,
        dest: destinationPath
    }, function(err){
        if(err) {
            Console.error("Error when trying to decompress")
            reject(err)
        } else {
            Console.info("Decompression finished successfully")
            resolve()
        }
    })
})

const download = (url, dest) =>{
  Console.debug("Downloading "+url)
  return new Promise((resolve, reject) => {
    const request = https.get(url, response => {
      if (response.statusCode === 200) {
        const file = fs.createWriteStream(dest, { flags: 'wx' })
        file.on('finish', () => {
          resolve()
        })
        file.on('error', err => {
          file.close()
          if (err.code === 'EEXIST'){
            Console.debug("File already exists")
            resolve()
          } 
          else{
            Console.debug("Error ",err.message)
            fs.unlink(dest, () => reject(err.message)) // Delete temp file
          }

        })
        response.pipe(file)
      } else if (response.statusCode === 302 || response.statusCode === 301) {
        //Console.debug("Servers redirected to "+response.headers.location)
        //Recursively follow redirects, only a 200 will resolve.
        download(response.headers.location, dest)
        .then(() => resolve())
        .catch(error => {
          Console.error(error)
          reject(error)
        })
      } else {
        Console.debug(`Server responded with ${response.statusCode}: ${response.statusMessage}`)
        reject(`Server responded with ${response.statusCode}: ${response.statusMessage}`)
      }
    })

    request.on('error', err => {
      reject(err.message)
    })
  })
}

module.exports = { download, decompress }