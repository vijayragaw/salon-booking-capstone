import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createApi, memoryStore } from './booking.mjs';

const api = createApi(memoryStore(), process.env.STAFF_KEY || 'local-demo-key');
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '127.0.0.1';
const assets = new Map([
  ['/', ['index.html', 'text/html']],
  ['/thank-you', ['index.html', 'text/html']],
  ['/styles.css', ['styles.css', 'text/css']],
  ['/booking.js', ['booking.js', 'text/javascript']],
]);

createServer(async (request, response) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Content-Security-Policy', "default-src 'self'; frame-ancestors 'none'");
  try {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) {
      request.setEncoding('utf8');
      let body = '';
      for await (const chunk of request) {
        body += chunk;
        if (body.length > 8192) {
          response.writeHead(413, { 'content-type': 'application/json' });
          response.end(JSON.stringify({ error: 'Request is too large.' }));
          return;
        }
      }
      const result = await api({
        requestContext: { http: { method: request.method } },
        rawPath: url.pathname,
        queryStringParameters: Object.fromEntries(url.searchParams),
        headers: request.headers,
        body,
      });
      response.writeHead(result.statusCode, result.headers);
      response.end(result.body);
      return;
    }

    const asset = assets.get(url.pathname);
    if (!asset || !['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(404).end();
      return;
    }
    const [file, type] = asset;
    const bytes = await readFile(new URL('../public/' + file, import.meta.url));
    response.writeHead(200, { 'content-type': type + '; charset=utf-8' })
      .end(request.method === 'HEAD' ? undefined : bytes);
  } catch (error) {
    console.error(error);
    response.writeHead(500, { 'content-type': 'application/json' })
      .end(JSON.stringify({ error: 'Something went wrong.' }));
  }
}).listen(port, host, () => console.log('Salon app is listening on port ' + port));
