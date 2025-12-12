# griffinwebserver_v2

This is a extremly lightweight library that is built right on top of nodejs builtin http functionality, no external librarys used for the core product.
(But common middleware might use them.)
The code itself is just 250 lines of code, of them 68 are defining mime types, and 54 lines of comments or empty lines.
Slowly it become more and more of a replacement for Express that is easier to maintain.

It's very easy to create middlewares that affect the data before it reaches it's endpoint. Take a look at griffinwebserver_v2-middleware-session as a example.
It's just as easy to create a endpoint (se the example). Both are actually treated the same way, first all pathmatching middlewares, in the order they were added, then the path matching endpoints in the order they were added. If it's not resolved after this it will continue to 'default' that is to serve files in a specific folder, something many know as "static".

Here is a very basic example serving a default file folder www/, a api endpoint /api/, and another folder for static files static/

```javascript
const Webserver = require('griffinwebserver_v2');
const webserver = new Webserver(path.join(__dirname, 'www/'), 8080);
webserver.start();

function apiFunction(req, res) {
  const baseUrl = 'http://' + req.headers.host + '/';
  const parsedUrl = new URL(req.url, baseUrl);
  res.end(parsedUrl.pathname.split('/')[2]);
}

webserver.addHandler('/api/', apiFunction);

webserver.addHandler('/stat/',webserver.static('static/'))

```

Here is a more advance example using the session middleware to handle login among other things.

```javascript
const Webserver = require('griffinwebserver_v2');
const session = require('griffinwebserver_v2-middleware-session');
const webserver = new Webserver(path.join(__dirname, 'www/'), 8080);
webserver.start();

function isJSON(str) {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

function apiFunction(req, res) {
  const baseUrl = 'http://' + req.headers.host + '/';
  const parsedUrl = new URL(req.url, baseUrl);

  // split the path into parts after removing leading /
  const pathParts = parsedUrl.pathname.substring(1).split('/');
  const apiName = pathParts[1]; // the second part of the path is the API name, first is /api/

  let responseBody;
  let body = []; // any posted data will go here
  let data = {};

  req.on('data', (data) => {
    body.push(data)
  });

  req.on('end', function () {
    dataDone();
  })

  function dataDone() {
    // convert posted data to data
    body = Buffer.concat(body).toString(); // convert to string
    if(isJSON(body)) body = JSON.parse(body); // parse the data if it is json

    req.session.data.counter = (req.session.data.counter || 0) + 1; // increment the counter of request made in this session
    req.statusCode = 200; // default status is Ok
    switch(apiName) {
      case 'hello':
        responseBody = 'Hello, world!';
        break;
      case 'counter':
        responseBody = 'Counter: ' + req.session.data.counter;
        break;
      case 'login':
        if(body.username === 'admin' && body.password === 'password') {
          req.session.data.loggedIn = true;
          responseBody = 'Logged in';
        } else {
          req.session.data.loggedIn = false;
          req.statusCode = 401;
          responseBody = 'Invalid username or password';
        }
       break;
      case 'logout':
        if(req.session.data.loggedIn) {
          req.session.data.loggedIn = false;
          responseBody = 'Logged out';
        } else {
          req.statusCode = 401;
          responseBody = 'Not logged in';
        }
       break;
        default:
          req.statusCode = 404;
          responseBody = 'Invalid API name';
    }
    res.end(responseBody);
  }
}

webserver.addMiddleware('/api/', session);
webserver.addEndpoint('/api/', apiFunction);
```
