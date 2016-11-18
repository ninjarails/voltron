window.Voltron = (function(cmd){
  var command = cmd.split('/', 2);
  var module = command[0];
  var method = command[1] || 'initialize';

  if(Voltron.hasModule(module)){
    var mod = Voltron.getModule(module);
    if($.isFunction(mod[method])){
      return mod[method].apply(mod, Array.prototype.slice.call(arguments, 1));
    }else{
      Voltron.debug('error', 'Module %o does not define the method %o', module, method);
    }
  }else{
    Voltron.debug('error', 'Module with name %o does not exist.', module);
  }
  return false;
});

$.extend(Voltron, {
  _config: {},
  _observer: {},
  _modules: {},
  _classes: {},

  _inherited: {
    on: function(){
      var args = Array.prototype.slice.call(arguments, 0);
      args.push(this);
      Voltron.on.apply(Voltron, args);
      return this;
    }
  },

  initialize: function(conf){
    if(!conf) conf = {};
    $.extend(this._config, conf);

    // Try and create a module with the name of the current controller
    if(this.hasModule(this.getConfig('controller'))){
      this.ready(Voltron.getModule, this.getConfig('controller'));
    }
  },

  // When ready, fire the callback function, passing in any additional args
  ready: function(callback, args){
    $(document).ready(function(){
      if(!$.isArray(args)) args = [args];
      callback.apply(Voltron, args);
    });
    return this;
  },

  debug: function(){
    if(this.isDebugging()){
      var method = arguments[0];
      var args = Array.prototype.slice.call(arguments, 1);
      console[method].apply(this, args);
    }
    return this;
  },

  // Get a config value, optionally define a default value in the event the config param is not defined
  getConfig: function(key, def){
    var out = this._config;
    if(!key) return out;
    var paths = key.replace(/(^\/+)|(\/+$)/g, '').split('/');

    $.each(paths, function(index, path){
      if(out[path] != undefined){
        out = out[path];
      }else{
        out = def;
        return false;
      }
    });

    return out;
  },

  // Set a config value
  setConfig: function(key, value){
    this._config[key] = value;
    return this;
  },

  // Similar to setConfig, except this will instead treat the config `key` value as an array, and add the value to it
  addConfig: function(key, value){
    if(!this._config[key]) this._config[key] = [];
    this._config[key].push(value);
    return this;
  },

  getAuthToken: function(){
    return this.getConfig('auth_token', '');
  },

  // Are we in debug mode?
  isDebugging: function(){
    return this.getConfig('debug', false);
  },

  isController: function(controllers){
    return [controllers].flatten().compact().includes(this.getConfig('controller'));
  },

  // Adds one or more event listener callbacks that will be dispatched when the event occurs
  // Optionally with a defined context for what `this` will be in the callback function
  // If not defined it defaults to the core Voltron module, aka - the stuff in this file
  // Example: Voltron.on('event1', 'event2', 'event3', function(observer){}, this);
  on: function(){
    var args = Array.prototype.slice.call(arguments, 0);
    var events = $.map(args, function(item){ if(typeof item == 'string') return item; });
    var callback = args[events.length];
    var context = args[events.length+1] || Voltron;

    $.each(events, function(index, event){
      if(!Voltron._observer[event]) Voltron._observer[event] = [];
      Voltron._observer[event].push($.proxy(callback, context));
    });
    return this;
  },

  // Dispatch an event, optionally providing some additional params to pass to the event listener callback
  dispatch: function(name, params){
    if(!params) params = {};
    this.debug('info', 'Dispatching %o', name);
    $.each(this._observer[name], function(index, callback){
      callback(params);
    });
    return this;
  },

  // Check if a module with the given name has been added
  hasModule: function(id){
    return this._modules[id.toLowerCase()] != undefined;
  },

  // Add a module, specifying the name (id), the module itself (should be an object or a function that returns such)
  // Optionally provide `true`, or an array of controller names as the last argument to auto instantiate when added either
  // all the time (if true), or on the specified controllers
  addModule: function(){
    var id = arguments[0];
    var depends = $.isFunction(arguments[1]) ? [] : arguments[1];
    var module = $.isFunction(arguments[1]) ? arguments[1] : arguments[2];
    var run = $.isFunction(arguments[1]) ? arguments[2] : arguments[3];

    if(!this.hasModule(id)){
      this._modules[id.toLowerCase()] = module;
    }

    // Wait until DOM loaded, then create instances of any modules that should be created
    this.ready(function(id, depends, run){
      if(run === true || (this.isController(run) && run !== false)){
        for(var i=0; i<depends.length; i++){
          this.getModule(depends[i]);
        }
        this.getModule(id);
      }
    }, [id, depends, run]);
    return this;
  },

  // Get a module with the given name from the list of modules
  getModule: function(name, args){
    var id = name.toLowerCase();
    if(!args) args = [];
    if(this.hasModule(id)){
      if(!this._classes[id]){
        this._classes[id] = new this._modules[id]($);
        // Add some inherited methods... shortcuts, if you will
        this._classes[id] = $.extend(this._classes[id], this._inherited);
        // Tell the user we've created the module
        this.debug('info', 'Instantiated %o', name);
        // If there is an initialize function, call it, dispatching before/after events
        if($.isFunction(this._classes[id].initialize)){
          Voltron.dispatch('before:module:initialize:' + id, { module: this._classes[id] });
          this._classes[id].initialize.apply(this._classes[id], args);
          Voltron.dispatch('after:module:initialize:' + id, { module: this._classes[id] });
        }
      }
      return this._classes[id];
    }else{
      this.debug('warn', 'Module with name %o does not exist.', name);
    }
    return false;
  }
});

if(typeof V != 'undefined'){
  console.warn('The window variable %o is already defined, so shortcut to %o will not be defined.', 'V', 'Voltron');
}else{
  window.V = window.Voltron;
}
