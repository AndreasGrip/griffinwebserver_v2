const Webserver = require('griffinwebserver_v2');
const webserver = new Webserver('www/', 8080);
webserver.start();

function apiFunction(req, res) {
  const baseUrl = 'http://' + req.headers.host + '/';
  const parsedUrl = new URL(req.url, baseUrl);
  res.end(parsedUrl.pathname.split('/')[2]);
}

webserver.addHandler('/api/', apiFunction);

/*
  if you point your browser towards http://127.0.0.1:8080/api/kaka you will be served with a page called kaka
*/