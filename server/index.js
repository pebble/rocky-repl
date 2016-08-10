#!/usr/bin/env node
var WebSocketServer = require('websocket').server;
var http = require('http');
var repl = require('repl');

var server = http.createServer(function(request, response) {
    response.writeHead(404);
    response.end();
});
server.listen(8080, function() {
    console.log((new Date()) + ' Rocky.js REPL is listening on port 8080');
});

wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false
});

function originIsAllowed(origin) {
  // put logic here to detect whether the specified origin is allowed.
  return true;
}

var connected = false;

wsServer.on('request', function(request) {
    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin
      request.reject();
      console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
      return;
    }

    if (connected) {
      console.log('Ignored connection request, already connected...');
      return;
    }

    var connection = request.accept('rocky-repl', request.origin);
    console.log((new Date()) + ' Connection accepted. Starting REPL:');
    connected = true;

    var tx_id = 0;
    var resultCallbacks = {};

    function remoteEval(cmd, context, filename, callback) {
      // TODO: properly handle multi-line input
      var t = tx_id++;
      var payload = {
        't': t,
        'c': cmd
      };
      resultCallbacks[t] = callback;
      connection.sendUTF(JSON.stringify(payload));
    }

    var replServer = repl.start({
      prompt: "rocky> ",
      input: process.stdin,
      output: process.stdout,
      eval: remoteEval
    });

    replServer.on('exit', function() {
      connection.close();
      connected = false;
      console.log('Closed connection... waiting to connect.');
    });

    connection.on('message', function(message) {
      if (message.type === 'utf8') {
        var payload;
        try {
          payload = JSON.parse(message.utf8Data);
        } catch(err) {
          console.error('Error parsing message: ' + message.utf8Data);
          return;
        }
        var tx_id = payload['t'];
        var result = payload['r'];
        resultCallbacks[tx_id](null, result);
        delete resultCallbacks[tx_id];
      }
      else {
        console.error('Unexpected message type: ' + message.type);
      }
    });

    connection.on('close', function(reasonCode, description) {
      console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
      connected = false;
      replServer.close();
    });
});
