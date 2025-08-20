const manifest = {
  "name": "",
  "short_name": "",
  "icons": [
    { "src": "/android-chrome-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/android-chrome-512x512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "theme_color": "#ffffff",
  "background_color": "#ffffff",
  "display": "standalone"
};

module.exports = (req, res) => {
  try {
    res.writeHead(200, {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(manifest));
  } catch (err) {
    console.error('manifest handler error', err);
    res.statusCode = 500;
    res.end('Server error');
  }
};
