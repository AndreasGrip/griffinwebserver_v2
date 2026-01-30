const http = require('node:http');
const url = require('node:url');
const fs = require('node:fs');
const path = require('node:path');
const fsProm = fs.promises;

// helper functions
function isObject(a) {
  return !!a && a.constructor === Object;
}

function isArray(a) {
  return !!a && a.constructor === Array;
}

// common mimetypes.
const mimeType = {
  '.7z': 'application/x-7z-compressed',
  '.acc': 'audio/aac',
  '.arc': 'application/x-freearc',
  '.avi': 'video/x-msvideo',
  '.bmp': 'image/bmp',
  '.bz': 'application/x-bzip',
  '.bz2': 'application/x-bzip2',
  '.csv': 'text/csv',
  '.css': 'text/css',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.eot': 'application/vnd.ms-fontobject',
  '.epub': 'application/epub+zip',
  '.gif': 'image/gif',
  '.gz': 'application/gzip',
  '.htm': 'text/html',
  '.html': 'text/html',
  '.ico': 'image/x-icon',
  '.ics': 'text/calendar',
  '.jar': 'application/java-archive',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.md': 'text/markdown',
  '.mid': 'audio/midi',
  '.midi': 'audio/x-midi',
  '.mjs': 'text/javascript',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.mpeg': 'video/mpeg',
  '.mpg': 'video/mpeg',
  '.odp': 'application/vnd.oasis.opendocument.presentation',
  '.odt': 'application/vnd.oasis.opendocument.text',
  '.ods': 'application/vnd.oasis.opendocument.spreadsheet',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.ogv': 'video/ogg',
  '.opus': 'audio/ogg',
  '.otf': 'font/otf',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.rar': 'application/x-rar-compressed',
  '.rtf': 'application/rtf',
  '.sh': 'application/x-sh',
  '.svg': 'image/svg+xml',
  '.tar': 'application/x-tar',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.tgz': 'application/x-compressed',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain',
  '.wav': 'audio/wav',
  '.weba': 'audio/webm',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
  '.woff': 'application/font-woff',
  '.woff2': 'application/font-woff2',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xml': 'text/xml',
  '.xul': 'application/vnd.mozilla.xul+xml',
  '.zip': 'application/zip',
};

module.exports = class WebServer {
  constructor(webfolder = 'www', port = 80, endpoints = [], middlewares = []) {
    // save the default file folder
    this.webfolder = webfolder;
    // save port and make sure it's a number, otherwise default to 80
    this.port = port;
    if (typeof this.port !== 'number') {
      console.log('Warning: port [' + this.port + '] not number using default port 80');
      this.port = 80;
    } else {
      this.port = Math.floor(this.port);
    };
    // if array just use the array, if object, just add the object within a array. default to empty array
    // todo validate handlers
    // Middlewares will run before the handlers and endpoints, should normally not end the request (but can do)
    this.middlewares = isArray(middlewares) ? middlewares : isObject(middlewares) ? [middlewares] : [];
    // Endpoint normally end the request.
    this.endpoints = isArray(endpoints) ? endpoints : isObject(endpoints) ? [endpoints] : [];

    // Add the webfolder as the default endpoint if nothing else have ended the request.
    const webfolderEndpoint = this.static(this.webfolder);
    this.endpoints.push({ pathName: '/', handler: webfolderEndpoint });
  }

  addMiddleware(pathName, handler) {
    const newHandler = { pathName: pathName, handler: handler };
    newHandler.handler.pathName = pathName;
    this.middlewares.push(newHandler);
  }

  addEndpoint(pathName, handler) {
    const newHandler = { pathName: pathName, handler: handler };
    newHandler.handler.pathName = pathName;
    this.endpoints.push(newHandler);
  }

  // legacy method name to add endpoints
  addHandler(pathName, handler) {
    this.addEndpoint(pathName, handler);
  }

  // method to create a endpoint that that serves files from a folder (staticPath)

  static(staticPath) {
    
    // if staticPath is a absolute path, use that path, otherwise use relative path from the folder were the program is installed.
    if (staticPath[0] !== '/') staticPath = path.join(__dirname, staticPath);

    return function (req, res) {
      // get rid of the "search" part of the url aka. parameters  /test/a?a=2&b=3 -> /test/a
      req.urlPart = new URL('http://1/' + req.urlPart).pathname
      let filePath = path.join(staticPath, req.urlPart);
      return fsProm
        .stat(filePath)
        .then((stat) => {
          // if is a directory, then look for index.html
          if (stat.isDirectory()) {
            filePath = path.join(filePath, 'index.html');
            return fsProm.stat(filePath);
          }
          return stat;
        })
        .then((stat) => {
          // based on the URL path, extract the file extension. e.g. .js, .doc, ...
          const ext = path.parse(filePath).ext.toLowerCase();
          // if the file is found, set Content-type and send data
          res.setHeader('Content-Length', stat.size);
          res.setHeader('Content-type', mimeType[ext] || 'application/octet-stream');
          res.streaming = true;
          const stream = fs.createReadStream(filePath);
          stream.pipe(res);
          stream.on('open', () => {
            console.log('serve file ' + filePath);
          });

          stream.on('error', (err) => {
            res.statusCode = !err.code || err.code === 'ENOENT' ? 404 : 500;
            if (process.env.NODE_ENV === 'development') {
              res.end('Error ' + res.statusCode + ': ' + err.message);
            } else {
              res.end('Error ' + res.statusCode);
            }
          });
        })
        .catch((err) => {
          res.statusCode = !err.code || err.code === 'ENOENT' ? 404 : 500;
          if (process.env.NODE_ENV === 'development') {
            res.end('Error ' + res.statusCode + ': ' + err.message);
          } else {
            res.end('Error ' + res.statusCode);
          }
        });
    };
  }

  webHandler(req, res) {
    // there is no way in nodejs to detect protocol, and honestly, there is almost always a nginx proxy in between so would only mess things upp.
    const baseUrl = 'http://' + req.headers.host + '/';
    const parsedUrl = new URL(req.url, baseUrl);

    // Filter out middleares and endpoints based on the pathName. Sort them to run the most accurate one first (longest match) first.
    const middlewaresToRun = this.parent.middlewares.filter((h) => h?.pathName && h.pathName === parsedUrl.pathname.slice(0, h.pathName.length));
    const endpointsToRun = this.parent.endpoints.filter((h) => h?.pathName && h.pathName === parsedUrl.pathname.slice(0, h.pathName.length));

    // combine middlewares and endpoints to run into an array (in the correct order)
    const allHandlersToRun = [...middlewaresToRun, ...endpointsToRun];

    // custom promise generator for this project..
    function promisify(call) {
      // if call is a promise, then just return it.
      if (call instanceof Promise) return call;
      // if call.handler is a function then run it.
      if (typeof call.handler === 'function') {
        const result = call.handler(req, res);
        // if call.handler generated a promise just return it
        if (result instanceof Promise) return result;
        // if call.handler generated anything but a promise, create a promise and resolve it with the result for consistency.
        return new Promise((resolve) => resolve(result));
      } else {
        // call is a function.
        return Promise.resolve(call);
      }
    }

    function requestHandler() {
      // if there is no handlers left to run, return 404 
      if (allHandlersToRun.length === 0)
        return promisify({
          handler: (req, res) => {
            res.statusCode = 404;
            res.end('404 - Not found');
          },
        });
      
      // get the next handler in the stack to run
      const handlerToRun = allHandlersToRun.shift();
      // get rid of the routing part of the URL 
      req.urlPart = path.join('/', req.url.slice(handlerToRun.pathName.length));

      const p = promisify(handlerToRun);
      // make this recurse
      p.then(() => {
        // writableEnded should really not happen. But it make some sense to not continue to loop if it have.
        if (!res.writableEnded && !res.streaming) requestHandler();
      }).catch((e) => {
        // if anything goes wrong I guess it makes sense to show it.
        console.error(e);
        res.statusCode = 500;
        res.end('Internal Server Error');
      });
    }

    requestHandler();
  }

  start() {
    this.WebServer = http.createServer(this.webHandler);
    this.WebServer.parent = this;
    console.log('Start webserver on port ' + this.port);
    this.WebServer.listen(this.port);

    this.WebServer.on('error', (err) => {
      console.log('Error: ' + err);
    });
  }
};
