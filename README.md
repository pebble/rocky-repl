# Rocky.js REPL

Super quick and dirty hacked up REPL, implemented entirely using the Rocky.js public API :)

## Set up

- Run `npm install` in the `server` directory to install dependencies.

## Usage

- Run in one terminal: `node server/index.js`
- Run in second terminal: `pebble build && pebble install --emulator chalk --logs`
- As soon as the app is launched, the REPL will be available in the second terminal.

### Watching .js source file

You can watch a .js file by adding `--watch <PATH_TO_FILE>` when invoking the server.
This will make the server monitor the specified file for changes. Whenever a change occurs, the new source is sent over to the watch.
This enables you to iterate really quickly over a piece of code. See demo video below to see it in action!

NOTE: no global state is reset before the new source is `eval()`'d. However, for convenience, all Rocky.js's event handlers are removed before the new source is run.
To avoid problems with global state, it's best to wrap your code in an immediately invoked function expression (IIFE), i.e.

```
(function() {

  // put your code & variable declarations here

})();
```

## Demo

https://www.youtube.com/watch?v=dv0P8H8_jbw
 