const Console = require('../utils/console');
const _fetch = require('node-fetch');
const storage = require('node-persist');

const HOST = "https://8000-a72835c1-5411-423b-86e2-dd8df8faab48.ws-us02.gitpod.io";

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
    else if(resp.status === 404) throw APIError("Package not found", 404)
    else if(resp.status >= 400){
      const error = await resp.json()
      if(error.detail || error.error){
        throw APIError(error.detail || error.error)
      }else if(error.non_field_errors){
        throw APIError(non_field_errors[0], error)
      }else if (typeof error === "object"){
        for(let key in error){
          throw APIError(error[key][0], error)
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
    return await fetch(`${HOST}/v1/auth/token/`, {
      body: JSON.stringify({ identification, password }),
      method: 'post'
    });

  }
  catch(err){
    Console.error(err.message);
    Console.debug(err);
  }
}
const publish = async (config) => {

  try{
    return await fetch(`${HOST}/v1/package/${config.slug}`,{
      method: 'PUT',
      body: JSON.stringify(config)
    })
  }
  catch(err){
    Console.error(err.message);
    Console.debug(err);
    throw err;
  }
}

const update = async (config) => {

  try{
    return await fetch(`${HOST}/v1/package/`,{
      method: 'POST',
      body: JSON.stringify(config)
    })
  }
  catch(err){
    Console.error(err.message);
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

module.exports = {login, publish, update }
