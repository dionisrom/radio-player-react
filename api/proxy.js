const https = require('https');
const http = require('http');
const { URL } = require('url');

module.exports = (req, res) => {
  try {
    const query = req.query || {};
    const target = query.url || (req.url && new URL(req.url, `http://${req.headers.host}`).searchParams.get('url'));
    if (!target) {
      res.statusCode = 400;
      res.end('Missing url parameter');
      return;
    }
    // Basic validation: only allow http(s) urls
    if (!/^https?:\/\//i.test(target)) {
      res.statusCode = 400;
      res.end('Invalid URL scheme');
      return;
    }

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range,Accept,User-Agent');
    if (req.method === 'OPTIONS') {
      res.statusCode = 200;
      res.end();
      return;
    }

    const urlObj = new URL(target);
    const client = urlObj.protocol === 'https:' ? https : http;
    const options = {
      method: 'GET',
      headers: {
        'User-Agent': req.headers['user-agent'] || 'RadioStream-Proxy',
        // Forward range requests if present
        ...(req.headers.range ? { range: req.headers.range } : {})
      }
    };

    const proxyReq = client.request(urlObj, options, (proxyRes) => {
      // Copy status and headers
      res.writeHead(proxyRes.statusCode || 200, {
        'content-type': proxyRes.headers['content-type'] || 'application/octet-stream',
        'accept-ranges': proxyRes.headers['accept-ranges'] || 'bytes',
        'content-length': proxyRes.headers['content-length'] || undefined,
      });
      proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
      console.error('Proxy request error', err);
      res.statusCode = 502;
      res.end('Bad gateway');
    });

    proxyReq.end();
  } catch (err) {
    console.error('Proxy handler error', err);
    res.statusCode = 500;
    res.end('Server error');
  }
};
