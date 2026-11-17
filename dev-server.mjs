import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, relative, resolve, sep } from 'node:path';

const preferredPort = Number(process.env.PORT || 5173);
const projectRoot = resolve('.');
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8'
};

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }

  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const filePath = resolve(projectRoot, relativePath);
    const fromRoot = relative(projectRoot, filePath);
    if (fromRoot === '..' || fromRoot.startsWith(`..${sep}`)) {
      response.writeHead(403).end('Forbidden');
      return;
    }

    const file = await readFile(filePath);
    response.writeHead(200, { 'Content-Type': contentTypes[extname(filePath).toLowerCase()] || 'application/octet-stream' });
    response.end(request.method === 'HEAD' ? undefined : file);
  } catch (error) {
    const notFound = error.code === 'ENOENT' || error instanceof URIError;
    response.writeHead(notFound ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(notFound ? 'Not found' : `Could not serve file: ${error.message}`);
  }
});

const listen = (port) => new Promise((resolve, reject) => {
  const onError = (error) => {
    server.off('listening', onListening);
    reject(error);
  };
  const onListening = () => {
    server.off('error', onError);
    resolve();
  };
  server.once('error', onError);
  server.once('listening', onListening);
  server.listen(port, '0.0.0.0');
});

try {
  await listen(preferredPort);
} catch (error) {
  if (error.code !== 'EADDRINUSE' || process.env.PORT) {
    console.error(`Could not start the development server: ${error.message}`);
    process.exit(1);
  }
  await listen(0);
}

const address = server.address();
console.log(`JR Footy Hub is running at http://localhost:${address.port}`);
