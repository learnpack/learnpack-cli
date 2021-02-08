var fs = require('fs')
var p = require('path')
let shell = require('shelljs')
const {cli} = require('cli-ux')
var targz = require('targz')
let Console = require('../utils/console')
var https = require('https')
var fetch = require('node-fetch')

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

const downloadEditor = async (version, destination) => {
  //https://raw.githubusercontent.com/learnpack/coding-ide/master/dist/app.tar.gz
  //if(versions[version] === undefined) throw new Error(`Invalid editor version ${version}`)
  const resp2 = await fetch(`https://github.com/learnpack/coding-ide/blob/${version}/dist`)
  if(!resp2.ok) throw InternalError(`Coding Editor v${version} was not found on learnpack repository, check the config.editor.version property on learn.json`)

  Console.info("Downloading the LearnPack coding UI, this may take a minute...")
  return await download(`https://github.com/learnpack/coding-ide/blob/${version}/dist/app.tar.gz?raw=true`, destination)
}

const download = (url, dest) =>{
  Console.debug("Downloading "+url)
  return new Promise((resolve, reject) => {
    const request = https.get(url, response => {
      if (response.statusCode === 200) {
        const file = fs.createWriteStream(dest, { flags: 'wx' })
        file.on('finish', () => {
          resolve(true)
        })
        file.on('error', err => {
          file.close()
          if (err.code === 'EEXIST'){
            Console.debug("File already exists")
            resolve("File already exists")
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

const clone = (repository=null, folder='./') => new Promise((resolve, reject)=>{

  if(!repository){
    reject("Missing repository url for this package")
    return false
  }

  cli.action.start('Verifying GIT...')
  if (!shell.which('git')) {
    reject('Sorry, this script requires git')
    return false
  }
  cli.action.stop()
  
  let fileName = p.basename(repository)
  if(!fileName){
    reject('Invalid repository information on package: '+repository)
    return false
  }
  
  fileName = fileName.split('.')[0];
  if(fs.existsSync("./"+fileName)){
    reject(`Directory ${fileName} already exists; Did you download this package already?`)
    return false
  }

  cli.action.start(`Cloning repository ${repository}...`)
  if (shell.exec(`git clone ${repository}`).code !== 0) {
    reject('Error: Installation failed')
  }
  cli.action.stop()

  cli.action.start('Cleaning installation...')
  if (shell.exec(`rm -R -f ${folder}${fileName}/.git`).code !== 0) {
    reject('Error: removing .git directory')
  }
  cli.action.stop()

  resolve("Done")
})

const rmSync = function(path) {
  var files = [];
  if( fs.existsSync(path) ) {
      files = fs.readdirSync(path);
      files.forEach(function(file,index){
          var curPath = path + "/" + file;
          if(fs.lstatSync(curPath).isDirectory()) { // recurse
              rmSync(curPath);
          } else { // delete file
              fs.unlinkSync(curPath);
          }
      });
      fs.rmdirSync(path);
  }
};

module.exports = { download, decompress, downloadEditor, clone, rmSync }
