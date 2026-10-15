// Local, read-only visual preview. This server never loads Electron or the optimizer.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const assets = new Map([
  ['/', ['dashboard.html', 'text/html; charset=utf-8']],
  ['/dashboard.html', ['dashboard.html', 'text/html; charset=utf-8']],
  ['/dashboard.css', ['dashboard.css', 'text/css; charset=utf-8']],
  ['/dashboard.js', ['dashboard.js', 'text/javascript; charset=utf-8']],
  ['/preview-data.js', ['preview-data.js', 'text/javascript; charset=utf-8']],
]);

const server = http.createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  try {
    const asset = assets.get(new URL(request.url, 'http://localhost').pathname);
    if (!asset) { response.writeHead(404).end(); return; }
    let body = await fs.readFile(path.join(__dirname, asset[0]), 'utf8');
    if (asset[0] === 'dashboard.html') {
      body = body.replace('</body>', '<script src="preview-data.js"></script></body>');
    }
    response.writeHead(200, {
      'Content-Type': asset[1],
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch (error) {
    console.error('Preview request failed:', error.message);
    response.writeHead(500).end();
  }
});

server.on('error', error => {
  console.error('Unable to start FixMe preview:', error.message);
  process.exitCode = 1;
});
server.listen(4173, '127.0.0.1', () => {
  console.log('FixMe visual preview: http://127.0.0.1:4173');
  console.log('Demonstration data only. Windows actions are disabled.');
});
