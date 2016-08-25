(function(global) {
  this.rocky = require('rocky');
  this.rocky.on('message', function(event) {
    var message = event.data;
    if (message.c) {
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
      } catch (e) {
        response.r = '' + e;
      }
      this.rocky.postMessage(response);
    } else {
      console.log('Unknown message:' + message);
    }
  });
})(this);
