const Console = require('../utils/console');
const _fetch = require('node-fetch');
const storage = require('node-persist');
const cli = require("cli-ux").default
// const HOST = "https://8000-a72835c1-5411-423b-86e2-dd8df8faab48.ws-us03.gitpod.io";
const HOST = "https://learnpack.herokuapp.com";

const fetch = async (url, options={}) => {

  let headers = { "Content-Type": "application/json" }
  let session = null;
  try{
      session = await storage.getItem('bc-payload');
      if(session.token && session.token != "" && !url.includes("/token")) headers["Authorization"] = "Token "+session.token;
  }
  catch(err){}

  try{
    const resp = await _fetch(url, {
      ...options,
      headers: { ...headers, ...options.headers }
    })

    if(resp.status >= 200 && resp.status < 300) return await resp.json()
    else if(resp.status === 401) throw APIError("Invalid authentication credentials", 401)
    else if(resp.status === 404) throw APIError("Package not found", 404)
    else if(resp.status >= 500) throw APIError("Impossible to connect with the server", 500)
    else if(resp.status >= 400){
      const error = await resp.json()
      if(error.detail || error.error){
        throw APIError(error.detail || error.error)
      }else if(error.non_field_errors){
        throw APIError(non_field_errors[0], error)
      }else if (typeof error === "object"){
        for(let key in error){
          throw APIError(`${key}: ${error[key][0]}`, error)
        }
      }else{
        throw APIError("Uknown error")
      }
    }
    else throw APIError("Uknown error")
  }
  catch(error){
    Console.error(error.message);
    throw error;
  }
}
const login = async (identification, password) => {

  try{
    cli.action.start('Looking for credentials...')
    await cli.wait(1000)
    const data = await fetch(`${HOST}/v1/auth/token/`, {
      body: JSON.stringify({ identification, password }),
      method: 'post'
    });
    cli.action.stop('ready')
    return data
  }
  catch(err){
    Console.error(err.message);
    Console.debug(err);
  }
}
const publish = async (config) => {
  
  const keys = ['difficulty', 'language', 'skills', 'technologies', 'slug', 'repository', 'author', 'title'];

  let payload = {}
  keys.forEach(k => config[k] ? payload[k] = config[k] : null);
  try{
    console.log("Package to publish: ", payload)
    cli.action.start('Updating package information...')
    await cli.wait(1000)
    const data = await fetch(`${HOST}/v1/package/${config.slug}`,{
      method: 'PUT',
      body: JSON.stringify(payload)
    })
    cli.action.stop('ready')
    return data
  }
  catch(err){
    console.log("payload", payload)
    Console.error(err.message);
    Console.debug(err);
    throw err;
  }
}

const update = async (config) => {

  try{
    cli.action.start('Updating package information...')
    await cli.wait(1000)
    const data = await fetch(`${HOST}/v1/package/`,{
      method: 'POST',
      body: JSON.stringify(config)
    })
    cli.action.stop('ready')
    return data
  }
  catch(err){
    Console.error(err.message);
    Console.debug(err);
    throw err;
  }
}

const getPackage = async (slug) => {
  try{
    cli.action.start('Downloading package information...')
    await cli.wait(1000)
    const data = await fetch(`${HOST}/v1/package/${slug}`)
    cli.action.stop('ready')
    return data
  }
  catch(err){
    if(err.status == 404) Console.error(`Package ${slug} does not exist`);
    else Console.error(`Package ${slug} does not exist`);
    Console.debug(err);
    throw err;
  }
}

const getLangs = async () => {
  try{
    cli.action.start('Downloading language options...')
    await cli.wait(1000)
    const data = await fetch(`${HOST}/v1/package/language`)
    cli.action.stop('ready')
    return data;
  }
  catch(err){
    if(err.status == 404) Console.error(`Package ${slug} does not exist`);
    else Console.error(`Package ${slug} does not exist`);
    Console.debug(err);
    throw err;
  }
}


const getAllPackages = async ({ lang='', slug='' }) => {
  try{
    cli.action.start('Downloading packages...')
    await cli.wait(1000)
    const data = await fetch(`${HOST}/v1/package/all?limit=100&language=${lang}&slug=${slug}`)
    cli.action.stop('ready')
    return data;
  }
  catch(err){
    Console.error(`Package ${slug} does not exist`);
    Console.debug(err);
    throw err;
  }
}

const APIError = (error, code) => {
  const message = error.message || error;
  const _err = new Error(message);
  _err.status = code || 400;
  return _err;
}

module.exports = {login, publish, update, getPackage, getLangs, getAllPackages }
