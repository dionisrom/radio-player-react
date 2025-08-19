const http = require('http');
const { parse } = require('url');
const path = require('path');

const apiDir = path.join(__dirname, 'api');

const server = http.createServer((req, res) => {
  const url = parse(req.url, true);
  if (url.pathname.startsWith('/api/')) {
    const handlerName = path.basename(url.pathname);
    try {
      const handlerPath = path.join(apiDir, handlerName + '.js');
      const handler = require(handlerPath);
      // augment req with parsed query
      req.query = url.query;
      handler(req, res);
    } catch (err) {
      console.error('API handler error', err);
      res.statusCode = 404;
      res.end('Not found');
    }
    return;
  }
  res.statusCode = 404;
  res.end('Not found');
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log('API server listening on port', port));
