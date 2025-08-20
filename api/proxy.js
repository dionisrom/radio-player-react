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
      // Pipe upstream response to the client and ensure we clean up if the
      // client disconnects so upstream connections don't remain open.
      proxyRes.pipe(res, { end: true });

      // If upstream errors, close client response
      proxyRes.on('error', (err) => {
        try { console.error('Proxy upstream error', err); } catch(e){}
        try { res.end(); } catch(e){}
      });

      // If the client disconnects, abort the upstream request and destroy
      // the upstream response stream to free resources promptly.
      const onClientClose = () => {
        try { proxyReq.destroy && proxyReq.destroy(); } catch (e) {}
        try { proxyRes.destroy && proxyRes.destroy(); } catch (e) {}
      };
      res.on('close', onClientClose);
    });

    proxyReq.on('error', (err) => {
      console.error('Proxy request error', err);
      res.statusCode = 502;
      try { res.end('Bad gateway'); } catch(e){}
    });

    // If the incoming client request is aborted/closed before the proxy request
    // completes, make sure to destroy the proxy request as well.
    req.on('close', () => {
      try { proxyReq.destroy && proxyReq.destroy(); } catch (e) {}
    });

    proxyReq.end();
  } catch (err) {
    console.error('Proxy handler error', err);
    res.statusCode = 500;
    res.end('Server error');
  }
};
