'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const net = require("net");
const util = require("util");
const assert = require("assert");
const poolio_1 = require("poolio");
const JSONStream = require("JSONStream");
console.log('starting this thing.');
console.log('project root => ', process.env.SUMAN_PROJECT_ROOT);
console.log('suman lib root => ', process.env.SUMAN_LIBRARY_ROOT_PATH);
if (!process.stdout.isTTY) {
    console.error('process is not a tty, cannot run suman-daemon.');
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
const p = new poolio_1.Pool({
    filePath: path.resolve(__dirname + '/suman-fast-script.js'),
    size: 3,
    env: Object.assign({}, process.env, {
        FORCE_COLOR: 1
    }),
    streamStdioAfterDelegation: true,
    oneTimeOnly: true,
    inheritStdio: true,
    resolveWhenWorkerExits: true
});
p.on('error', function (e) {
    console.error('pool error => ', e.stack || e);
});
const s = net.createServer(function (socket) {
    console.log('socket connection made.');
    socket.pipe(JSONStream.parse())
        .on('error', function (e) {
        console.error(e.stack || e);
        socket.end(e.stack || e);
    })
        .on('data', function (obj) {
        console.log('message from ', util.inspect(obj));
        try {
            assert(typeof obj.pid === 'number', 'object has no process id.');
            assert(Array.isArray(obj.args), 'object has no arguments array.');
        }
        catch (err) {
            console.error(err.message);
            return;
        }
        return p.any(obj, { socket });
    });
});
const port = 9091;
s.once('listening', function () {
    console.log(`suman daemon tcp server listening on port ${port}`);
});
s.listen(port);
