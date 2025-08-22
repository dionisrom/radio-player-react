// ICY fallback fetcher for radio metadata
// Usage: fetchIcyMetadata(url).then(meta => ...)
const icy = require('icy');

function fetchIcyMetadata(url) {
  return new Promise((resolve, reject) => {
    icy.get(url, function (res) {
      let metaReceived = false;
      res.on('metadata', function (metadata) {
        metaReceived = true;
        const parsed = icy.parse(metadata);
        resolve(parsed);
        res.socket && res.socket.destroy(); // close connection after receiving metadata
      });
      res.on('end', function () {
        if (!metaReceived) reject(new Error('No metadata received'));
      });
      res.on('error', function (err) {
        reject(err);
      });
    }).on('error', reject);
  });
}

module.exports = fetchIcyMetadata;
