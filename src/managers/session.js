const Console = require('../utils/console');
const fetch = require('node-fetch');
const v = require('validator');
const { ValidationError, InternalError } = require('../utils/errors');
const moment = require('moment');
const fs = require('fs');
const storage = require('node-persist');

module.exports = {
    sessionStarted: false,
    token: null,
    config: null,
    currentCohort: null,
    initialize: async function(){
      if(!this.sessionStarted){
        
        if(!this.config) throw InternalError('Configuration not found')
        if(!fs.existsSync(this.config.dirPath)) fs.mkdirSync(this.config.dirPath)
        await storage.init({ dir: `${this.config.dirPath}/.session` });
        this.sessionStarted = true;
      }
      return true
    },
    setPayload: async function(value){
      await this.initialize();
      await storage.setItem('bc-payload', { assets_token: this.token, ...value });
      Console.debug("Payload successfuly found and set for "+value.email);
      return true;
    },
    getPayload: async function(){
      await this.initialize();
      let payload = null;
      try{
         payload = await storage.getItem('bc-payload');
      }
      catch(err){
        Console.debug("Error retriving session payload");
      }
      return payload;
    },
    isActive: function(){
      if(this.token) return true;
      else return false;
    },
    get: async function(config=null){
      if(config) this.config = config;

      await this.sync();
      if(!this.isActive()) return null;

      const payload = await this.getPayload();
      return {
        payload, token: this.token,
      };
    },
    login: async function(){

        try{
          var email = await cli.prompt('What is your name?')
          if(!v.isEmail(email)) throw new ValidationError('Invalid email');

          var password = await cli.prompt('What is your two-factor token?', {type: 'mask'})

          let url = 'https://assets.breatheco.de/apis/credentials';
          const resp = await fetch(url+'/auth', {
            body: JSON.stringify({ username: email, password, user_agent: 'bc/cli' }),
            method: 'post'
          });
          if(resp.status === 200){
            const data = await resp.json();
            this.start({ token: data.assets_token, payload: data });
          }
          else if(resp.status >= 400){
            const error = await resp.json();
            if(error.msg){
              let m = /\{"code":(\d{3}),"msg":"(.*)"\}/gm.exec(error.msg);
              if(m) Console.error(m[2]);
              else{
                let m = /"error_description":"(.*)"/gm.exec(error.msg);
                if(m) Console.error(m[1]);
                else{
                  Console.error('Uknown Error');
                  Console.debug(error.msg);
                }
              }
            }
            else Console.error(error.error_description || error.message || error);
          }
          else Console.debug(`Error ${resp.status}: `, await resp.json().msg);
        }
        catch(err){
          Console.error(err.message);
          Console.debug(err);
        }

    },
    sync: async function(){
      const payload = await this.getPayload();
      if(payload) this.token = payload.assets_token;
    },
    start: async function({ token, payload=null }){
      if(!token) throw new Error("A token and email is needed to start a session");
      this.token = token;
      if(payload) if(await this.setPayload(payload)) Console.success(`Successfully logged in as ${payload.email}`);
    },
    destroy: async function(){
        await storage.clear();
        this.token = token;
        Console.success('You have logged out');
    }
};