const Console = require('../utils/console');
const api = require('../utils/api');

const v = require('validator');
const { ValidationError, InternalError } = require('../utils/errors');
const moment = require('moment');
const fs = require('fs');
const cli = require("cli-ux").default
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
      await storage.setItem('bc-payload', { token: this.token, ...value });
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
    get: async function(configObj=null){
      if(configObj) this.config = configObj.config;

      await this.sync();
      if(!this.isActive()) return null;

      const payload = await this.getPayload();
      return {
        payload, token: this.token,
      };
    },
    login: async function(){

      var email = await cli.prompt('What is your email?')
      if(!v.isEmail(email)) throw ValidationError('Invalid email');

      var password = await cli.prompt('What is your password?', {type: 'hide'})

      const data = await api.login(email, password);
      if(data) this.start({ token: data.token, payload: data });

    },
    sync: async function(){
      const payload = await this.getPayload();
      if(payload) this.token = payload.token;
    },
    start: async function({ token, payload=null }){
      if(!token) throw new Error("A token and email is needed to start a session");
      this.token = token;
      if(payload) if(await this.setPayload(payload)) Console.success(`Successfully logged in as ${payload.email}`);
    },
    destroy: async function(){
        await storage.clear();
        this.token = null;
        Console.success('You have logged out');
    }
};
