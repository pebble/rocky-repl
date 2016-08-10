(function() {
  var _global = this;  // FIXME: how to do this in a nicer way?
  this.rocky = require('rocky');
  this.rocky.on('message', function(event) {
    var message = event.data;
    if (message.c) {
      var response = {
        't': message.t,
      };

      try {
        var result = eval.apply(_global, [message.c]);
        if (result === undefined) {
          // Save some bandwidth, don't include anything :)
        } else if (result === null) {
          response.r = 'null';
        } else {
          // TODO: are there any other things that don't have .toString() ?
          response.r = result.toString();
        }
      } catch (e) {
        response.r = e.toString();
      }
      rocky.postMessage(response);
    } else {
      console.log('Unknown message:' + message);
    }
  });
})();
