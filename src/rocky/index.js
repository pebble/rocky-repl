'use strict';

(function(global) {
  var rocky = require('rocky');
  global.rocky = rocky;

  function wrapFunction(context, functionName, cb) {
    var orig = context[functionName];
    context[functionName] = function() {
      console.log('In wrapper ' + functionName + ' ' + arguments);
      var result = orig.apply(this, arguments);
      cb.apply(this, [result, arguments]);
    };
  }

  global.require = function(moduleName) {
    if (moduleName !== 'rocky') {
      throw 'Module not found: ' + moduleName;
    }
    return rocky;
  }

  var setTimeoutTimers = {};
  wrapFunction(global, 'setTimeout', function(timer) {
    setTimeoutTimers[timer] = true;
  });

  var setIntervalTimers = {};
  wrapFunction(global, 'setInterval', function(timer) {
    setIntervalTimers[timer] = true;
  });

  wrapFunction(global, 'clearTimeout', function(timer) {
    delete setTimeoutTimers[timer];
  });

  wrapFunction(global, 'clearInterval', function(timer) {
    delete setIntervalTimers[timer];
  });

  var listeners = {};
  function addEventListener(type, handler) {
    listeners[type] = listeners[type] || new Array();
    listeners[type].push(handler);
  }
  wrapFunction(rocky, 'addEventListener', function(_, args) {
    addEventListener.apply(this, args);
  });
  wrapFunction(rocky, 'on', function(_, args) {
    addEventListener.apply(this, args);
  });
  // Don't bother wrapping off/removeEventListener

  // Best effort attempt at resetting things...
  function reset() {
    for (var timer in setTimeoutTimers) {
      clearTimeout(parseInt(timer, 10));
    };
    setTimeoutTimers = {};
    for (var timer in setIntervalTimers) {
      clearInterval(parseInt(timer, 10));
    };
    setIntervalTimers = {};

    // rocky.off() everything:
    for (var type in listeners) {
      for (var i = 0; i < listeners[type].length; i++) {
        if (type === 'message') {
          continue;
        }
        rocky.off(type, listeners[type][i]);
      }
    }
    listeners = {};
  }

  rocky.on('message', function(event) {
    var message = event.data;
    if (message.c) {
      if (message.r) {
        reset();
      }

      var response = {
        't': message.t,
      };

      try {
        var result = eval.apply(global, [message.c]);
        if (result === undefined) {
          // Save some bandwidth, don't include anything :)
        } else if (result === null) {
          response.r = 'null';
        } else {
          response.r = '' + result;
        }
        rocky.requestDraw();
      } catch (e) {
        response.r = '' + e;
      }
      rocky.postMessage(response);
    } else {
      console.log('Unknown message:' + message);
    }
  });
})(Function('return this')());
