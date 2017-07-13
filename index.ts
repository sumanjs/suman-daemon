'use strict';

//core
import fs = require('fs');
import path = require('path');
import net = require('net');
import util = require('util');
import assert = require('assert');

//npm
import residence = require('residence');
import {Pool} from 'poolio';
import JSONStream = require('JSONStream');

console.log('starting this thing.');

///////////////////////////////////////////////

// const projectRoot = residence.findProjectRoot(process.cwd());
// const sumanLibRoot = path.resolve(__dirname + '/../../../');

console.log('project root => ', process.env.SUMAN_PROJECT_ROOT);
console.log('suman lib root => ', process.env.SUMAN_LIBRARY_ROOT_PATH);

if (!process.stdout.isTTY) {
  console.error('process is not a tty, cannot run suman-daemon.');
  // process.exit(1);
}

const f = path.resolve(process.env.HOME + '/.suman/daemon.pid');
try {
  fs.writeFileSync(f, String(process.pid));
}
catch (err) {
  console.error('\n', err.stack, '\n');
  process.exit(1);
}

console.log('suman daemon loaded...');

const p = new Pool({
  filePath: path.resolve(__dirname + '/lib/suman-fast-script.js'),
  size: 3,
  env: Object.assign({}, process.env),
  // env: Object.assign({}, process.env, {
  //   SUMAN_LIBRARY_ROOT_PATH: sumanLibRoot,
  //   SUMAN_PROJECT_ROOT: projectRoot
  // }),
  streamStdioAfterDelegation: true,
  oneTimeOnly: true,
  inheritStdio: true,
  resolveWhenWorkerExits: true
});

p.on('error', function (e: Error) {
  console.error('pool error => ', e.stack || e);
});

const s = net.createServer(function (socket) {

  console.log('socket connection made.');

  socket.pipe(JSONStream.parse())
  .on('error', function (e: Error) {
    console.error(e.stack || e);
    socket.end(e.stack || e);
  })
  .on('data', function (obj: Object) {

    console.log('message from ', util.inspect(obj));

    try {
      assert(typeof obj.pid === 'number', 'object has no process id.');
      assert(Array.isArray(obj.args), 'object has no arguments array.');
    }
    catch (err) {
      console.error(err.message);
      return;
    }

    // socket.write('pinnochio');
    return p.any(obj, {socket});
  });

});

const port = 9091;

s.once('listening', function () {
  console.log(`suman daemon tcp server listening on port ${port}`);
});

s.listen(port);








