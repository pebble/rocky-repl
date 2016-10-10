#!/usr/bin/env node
'use strict';

const parseArgs = require('minimist');

const args = parseArgs(process.argv.slice(2), {
  string: 'watch',
  unknown: (o) => {
    console.error('USAGE: node server/index.js [--watch file_path_to_watch.js]');
    process.exit(-1);
  }
});

const sourceFilePath = args.watch;
runReplServer(sourceFilePath, 8080);


function runReplServer(sourceFilePath, websocketPort) {
  const crypto = require('crypto');
  const WebSocketServer = require('websocket').server;
  const http = require('http');
  const repl = require('repl');
  const fs = require('fs');
  const prompt = 'rocky> ';

  let connected = false;

  function log() {
    if (connected) {
      // Not fool-proof, but didn't see how to do this cleanly at a glance.
      process.stdout.write('\n');
    }
    const argsArray = Array.prototype.slice.call(arguments);
    argsArray[0] = `${new Date()} | ${argsArray[0]}`
    console.log.apply(console, argsArray);
    if (connected) {
      process.stdout.write(prompt);
    }
  }

  // Check whether the file is accessible:
  ((sourceFilePath) => {
    if (sourceFilePath) {
      try {
        fs.accessSync(sourceFilePath, 'r');
      } catch (e) {
        log(`Cannot find '${sourceFilePath}'!`);
        process.exit(-1);
      }
      log(`Watching '${sourceFilePath}' for changes...`);
    }
  })(sourceFilePath);

  const server = http.createServer(function(request, response) {
      response.writeHead(404);
      response.end();
  });
  server.listen(websocketPort, function() {
      log(`Rocky.js REPL is listening on port ${websocketPort}`);
  });

  const wsServer = new WebSocketServer({
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

  wsServer.on('request', function(request) {
    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin
      request.reject();
      log('Connection from origin ' + request.origin + ' rejected.');
      return;
    }

    if (connected) {
      log('Ignored connection request, already connected...');
      return;
    }

    const connection = request.accept('rocky-repl', request.origin);
    log('Connection accepted. Starting REPL:');
    connected = true;

    let tx_id = 0;
    const resultCallbacks = {};

    function send(cmd, resultCb, shouldReset) {
      const t = tx_id++;
      const payload = {
        t: t,
        c: cmd,
        r: shouldReset ? 1 : undefined
      };
      resultCallbacks[t] = resultCb;
      connection.sendUTF(JSON.stringify(payload));
    }

    function remoteEval(cmd, context, filename, callback) {
      // TODO: properly handle multi-line input
      send(cmd, (result) => {
        callback(null, result);
      });
    }

    let sourceFileWatcher;
    if (sourceFilePath) {
      let md5;
      const updateFromSourceIfChanged = () => {
        fs.readFile(sourceFilePath, 'utf8', function (err, source) {
          if (err) {
            log(err);
            return;
          }
          const newMd5 = crypto.createHash('md5').update(source).digest('hex');
          if (md5 === newMd5) {
            // Don't send new source if it hasn't changed.
            return;
          }
          md5 = newMd5;
          send(source, (result) => {
            log(`'${sourceFilePath}' updated, eval() result: ${result}`);
          }, true /* shouldReset */);
        });
      };

      sourceFileWatcher = fs.watch(sourceFilePath, { persistent: false }, (eventType, filename) => {
        if (eventType === 'change') {
          updateFromSourceIfChanged();
        }
      });

      updateFromSourceIfChanged();
    }

    function closeSourceFileWatcher() {
      if (sourceFileWatcher) {
        sourceFileWatcher.close();
      }
    }

    const replServer = repl.start({
      prompt: prompt,
      input: process.stdin,
      output: process.stdout,
      eval: remoteEval
    });

    replServer.on('exit', function() {
      closeSourceFileWatcher();
      process.stdout.write('\n');
      if (connected) {
        connection.close();
        connected = false;
        process.exit(0);
      }
    });

    connection.on('message', function(message) {
      if (message.type === 'utf8') {
        let payload;
        try {
          payload = JSON.parse(message.utf8Data);
        } catch(err) {
          log('Error parsing message: ' + message.utf8Data);
          return;
        }
        const tx_id = payload['t'];
        const result = payload['r'];
        resultCallbacks[tx_id](result);
        delete resultCallbacks[tx_id];
      }
      else {
        log('Unexpected message type: ' + message.type);
      }
    });

    connection.on('close', function(reasonCode, description) {
      closeSourceFileWatcher();
      connected = false;
      replServer.close();
      log('Peer ' + connection.remoteAddress + ' disconnected.');
      log('Waiting for reconnection...');
    });
  });
};
