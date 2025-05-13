griffinwebserver_v2 is a extremly lightweight library that is built right on top of nodejs builtin http functionality, no external librarys used. (middleware might use them) and the entire code is 139 lines that contains code and 50 of them are defining mime types,
Standard behavior is to serve files in a folder, but you can easily create custom behavior for for specific paths, usually the backend.

It's also possible to create middle ware that will run before the request reach the specific path, this can for instance be used to add support for sessions using griffinwebserver_v2-session 

Basically this library is perfect for projects that is mostly backend, but also need to some files served.

An example would be a search page where backend handle reqests to the database, but there need to be some static files for the gui.

Here is a very basic example

```javascript
const Webserver = require('griffinwebserver_v2');
const webserver = new Webserver('www/', 8080);
webserver.start();

function apiFunction(req, res) {
  const baseUrl = 'http://' + req.headers.host + '/';
  const parsedUrl = new URL(req.url, baseUrl);
  res.end(parsedUrl.pathname.split('/')[2]);
}

webserver.addHandler('/api/', apiFunction);`
```

Here is a more advance example using the session middleware to handle login among other things.

```javascript
const Webserver = require('griffinwebserver_v2');
const session = require('griffinwebserver_v2-session');
const webserver = new Webserver('www/', 8080);
webserver.start();

function isJSON(str) {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

function httpFormToObject(formData) {
  // if it's not a string it's not formdata
  if (typeof formData !== 'string') return formData;
  // if it's valid json it's not formdata
  if (!isJSON(formData)) return formData;
  // if there is no equals sign it's not formdata
  if(formData.indexOf('=') === -1) return formData;

  
  const formDataObj = {};
  const formDataArr = formData.split('&');
  for (let i = 0; i < formDataArr.length; i++) {
    const pair = formDataArr[i].split('=');
    formDataObj[pair[0]] = decodeURIComponent(pair[1]);
  }
  return formDataObj;
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
    body = parseFormData(body); // parse the data in to an object if posted form
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

webserver.addMiddleware(session);

webserver.addHandler('/api/', apiFunction);
```
