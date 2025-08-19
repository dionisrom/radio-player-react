const https = require('https');
const http = require('http');
const { URL } = require('url');

// Pooled SSE ICY metadata proxy. Keeps one upstream connection per unique stream URL
// and fans out parsed metadata to all connected SSE clients.

const pools = new Map(); // key: url -> { clients: Set<res>, req, proxyRes, icyMetaInt, bytesUntilMeta, pendingMeta, awaitingMeta }

function parseIcyMetadata(raw) {
  const out = {};
  raw.split(';').forEach(part => {
    const [k, ...rest] = part.split('=');
    if (!k) return;
    const key = k.trim();
    let val = rest.join('=').trim();
    if (val.startsWith("'") && val.endsWith("'")) {
      val = val.slice(1, -1);
    }
    if (val) out[key] = val;
  });
  return out;
}

function sendEventToRes(res, event, data) {
  try {
    res.write(`event: ${event}\n`);
    const safe = ('' + data).replace(/\r/g, '').replace(/\n/g, '\\n');
    res.write(`data: ${safe}\n\n`);
  } catch (e) {}
}

function startPoolForUrl(target) {
  if (pools.has(target)) return pools.get(target);
  const urlObj = new URL(target);
  const client = urlObj.protocol === 'https:' ? https : http;
  const options = {
    method: 'GET',
    headers: {
      'User-Agent': 'RadioStream-Meta-Pool',
      'Icy-MetaData': '1'
    },
    timeout: 30000,
  };
  const pool = {
    clients: new Set(),
    req: null,
    proxyRes: null,
    icyMetaInt: 0,
    bytesUntilMeta: 0,
    pendingMeta: Buffer.alloc(0),
    awaitingMeta: 0,
  };

  const req = client.request(urlObj, options, (proxyRes) => {
    pool.proxyRes = proxyRes;
    pool.icyMetaInt = parseInt(proxyRes.headers['icy-metaint'] || '0', 10) || 0;
    pool.bytesUntilMeta = pool.icyMetaInt;

    proxyRes.on('data', (chunk) => {
      try {
        let offset = 0;
        while (offset < chunk.length) {
          if (pool.awaitingMeta > 0) {
            const take = Math.min(pool.awaitingMeta, chunk.length - offset);
            pool.pendingMeta = Buffer.concat([pool.pendingMeta, chunk.slice(offset, offset + take)]);
            pool.awaitingMeta -= take;
            offset += take;
            if (pool.awaitingMeta === 0) {
              const raw = pool.pendingMeta.toString('utf8').replace(/\0+$/g, '');
              const m = parseIcyMetadata(raw);
              for (const res of pool.clients) sendEventToRes(res, 'metadata', JSON.stringify({ streamTitle: m.StreamTitle || '', raw }));
              pool.pendingMeta = Buffer.alloc(0);
              pool.bytesUntilMeta = pool.icyMetaInt;
            }
          } else {
            const remain = chunk.length - offset;
            const toConsume = pool.icyMetaInt ? Math.min(pool.bytesUntilMeta, remain) : remain;
            offset += toConsume;
            pool.bytesUntilMeta -= toConsume;
            if (pool.icyMetaInt && pool.bytesUntilMeta === 0) {
              if (offset >= chunk.length) {
                pool.awaitingMeta = -1;
                break;
              }
              const metaLenByte = chunk.readUInt8(offset);
              offset += 1;
              const metaLen = metaLenByte * 16;
              if (metaLen === 0) {
                pool.bytesUntilMeta = pool.icyMetaInt;
                continue;
              }
              if (offset + metaLen <= chunk.length) {
                const metaBuf = chunk.slice(offset, offset + metaLen);
                offset += metaLen;
                const raw = metaBuf.toString('utf8').replace(/\0+$/g, '');
                const m = parseIcyMetadata(raw);
                for (const res of pool.clients) sendEventToRes(res, 'metadata', JSON.stringify({ streamTitle: m.StreamTitle || '', raw }));
                pool.bytesUntilMeta = pool.icyMetaInt;
                continue;
              }
              pool.pendingMeta = Buffer.concat([pool.pendingMeta, chunk.slice(offset)]);
              pool.awaitingMeta = metaLen - (chunk.length - offset);
              offset = chunk.length;
            }
          }
        }
      } catch (err) {
        console.warn('Pool parse error', err);
      }
    });

    proxyRes.on('end', () => {
      for (const res of pool.clients) {
        try { sendEventToRes(res, 'end', '{}'); res.end(); } catch (e) {}
      }
      pools.delete(target);
    });
    proxyRes.on('error', (err) => {
      console.error('Pool upstream error', err);
      for (const res of pool.clients) {
        try { sendEventToRes(res, 'error', '{}'); res.end(); } catch (e) {}
      }
      pools.delete(target);
    });
  });

  req.on('error', (err) => {
    console.error('Pool request error', err);
    for (const res of pool.clients) {
      try { sendEventToRes(res, 'error', '{}'); res.end(); } catch (e) {}
    }
    pools.delete(target);
  });

  req.end();
  pool.req = req;
  pools.set(target, pool);
  return pool;
}

module.exports = (req, res) => {
  try {
    const query = req.query || {};
    const target = query.url || (req.url && new URL(req.url, `http://${req.headers.host}`).searchParams.get('url'));
    if (!target) {
      res.statusCode = 400;
      res.end('Missing url parameter');
      return;
    }
    if (!/^https?:\/\//i.test(target)) {
      res.statusCode = 400;
      res.end('Invalid URL scheme');
      return;
    }

    // SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write('\n');

    const pool = startPoolForUrl(target);
    // immediately tell client if upstream has no icy-metaint (we'll detect when proxyRes arrives)
    pool.clients.add(res);

    // If the upstream already determined it has no metadata, notify client
    if (pool.icyMetaInt === 0 && pool.proxyRes) {
      sendEventToRes(res, 'nometadata', '{}');
      // schedule close shortly
      setTimeout(() => { try { res.end(); } catch (e) {} }, 1100);
    }

    // When the client closes, remove it
    req.on('close', () => {
      pool.clients.delete(res);
      try { res.end(); } catch (e) {}
      // if no clients remain, close upstream
      if (pool.clients.size === 0) {
        try { pool.req.abort && pool.req.abort(); } catch (e) {}
        try { pool.proxyRes && pool.proxyRes.destroy && pool.proxyRes.destroy(); } catch (e) {}
        pools.delete(target);
      }
    });
  } catch (err) {
    console.error('Meta pool handler error', err);
    try { res.end(); } catch (e) {}
  }
};
