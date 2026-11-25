#!/usr/bin/env node
/*
  Optional: a tiny local web server for trying Accountea on your own computer.
  You do NOT need it to put the site online - just upload the files to any web host.

    node server.js          then open http://localhost:3000
*/
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
};

http.createServer(function (req, res) {
  let name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (name === '/') name = '/index.html';
  const file = path.join(__dirname, path.normalize(name));
  const allowed = path.dirname(file) === __dirname && TYPES[path.extname(file)] && path.basename(file) !== 'server.js';
  if (!allowed) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Not found');
  }
  fs.readFile(file, function (err, data) {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] });
    res.end(data);
  });
}).listen(PORT, function () {
  console.log('Accountea is running - open http://localhost:' + PORT);
});
