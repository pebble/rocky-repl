var connected = false;
var ws;

var reconnectionTimer = setInterval(function() {
  if (connected) {
    return;
  }
  console.log('Attempting to connect to server...');
  ws = new WebSocket('ws://localhost:8080', ['rocky-repl']);
  ws.onopen = function() {
    connected = true;
    console.log('Connected to Rocky.js REPL server!')
  };

  ws.onmessage = function (evt) {
    Pebble.postMessage(JSON.parse(evt.data));
  };

  ws.onclose = function() {
    connected = false;
    console.log('Connection is closed...'); 
  };

  ws.onerror = function(e) {
    connected = false;
    console.error(e);
  };
}, 1000);

Pebble.on('message', function(event) {
  // Get the message that was passed
  var message = event.data;
  if (ws) {
    ws.send(JSON.stringify(message));
  }
});
