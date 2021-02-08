let connect = require('socket.io');
let Console = require('../utils/console');

module.exports = {
    socket: null,
    config: null,
    allowedActions: null,
    actionCallBacks: {
        clean: (data, s) => {
            s.logs = [];
        },
    },
    addAllowed: function(actions){
      if(!Array.isArray(actions)) actions = [actions];

      //avoid adding the "test" action if grading is disabled
      if(actions.includes("test") && this.config.disable_grading) 
        actions = actions.filter(a => a != "test");
      
                                                                  //remove duplicates
      this.allowedActions = this.allowedActions.filter(a => !actions.includes(a)).concat(actions);
    },
    removeAllowed: function(actions){
      if(!Array.isArray(actions)) actions = [actions];
      this.allowedActions = this.allowedActions.filter(a => !actions.includes(a));
    },
    start: function(config, server){
        this.config = config;

        // remove test action if grading is disabled
        this.allowedActions = config.actions.filter(act => config.disable_grading ? act !== 'test' : true);

        this.socket = connect(server);
        this.socket.on('connection', (socket) => {
          Console.debug("Connection with client successfully established", this.allowedActions);
          this.log('ready',['Ready to compile or test...']);

          socket.on('compiler', ({action, data}) => {

            this.emit('clean','pending',['Working...']);

            if(typeof data.exerciseSlug == 'undefined'){
              this.log('internal-error',['No exercise slug specified']);
              Console.error("No exercise slug especified");
              return;
            }

            if(typeof this.actionCallBacks[action] == 'function') this.actionCallBacks[action](data);
            else this.log('internal-error',['Uknown action '+action]);

          });
        });
    },
    on: function(action, callBack){
        this.actionCallBacks[action] = callBack;
    },
    clean: function(status='pending', logs=[]){
      this.emit('clean','pending',logs);
    },
    ask: function(questions=[]){

      return new Promise((resolve, reject) => {
        this.emit('ask','pending', ["Waiting for input..."], questions);
        this.on('input', ({ inputs }) => resolve(inputs));
      })
    },
    reload: function(files=null, exercises=null){
      this.emit('reload', files, exercises);
    },
    
    log: function(status, messages=[],report=[], data=null){
      this.emit('log',status,messages,[],report, data);
      Console.log(messages)
    },
    emit: function(action, status='ready', logs=[], inputs=[], report=[], data=null){

      if(['webpack','vanillajs','vue', 'react', 'css', 'html'].includes(this.config.compiler)){
        if(['compiler-success', 'compiler-warning'].includes(status)) this.addAllowed('preview');
        if(['compiler-error'].includes(status) || action == 'ready') this.removeAllowed('preview');
      }

      if(this.config.grading === 'incremental'){
        this.removeAllowed('reset');
      }

      this.socket.emit('compiler', { action, status, logs, allowed: this.allowedActions, inputs, report, data });
    },


    ready: function(message){
      this.log('ready',[message])
    },
    success: function(type,stdout=''){
      
      const types = ['compiler', 'testing']
      if(!types.includes(type)) this.fatal(`Invalid socket success type "${type}" on socket`)
      else{
        if(stdout === "") this.log(type+'-success', [ "No stdout to display on the console" ])
        else this.log(type+'-success', [ stdout ])
      } 
    },
    error: function (type, stdout){
      console.error("Socket error: "+type, stdout)
      this.log(type, [ stdout ])
    },
    fatal: function(msg){
      this.log('internal-error', [ msg ])
      throw msg
    }
};