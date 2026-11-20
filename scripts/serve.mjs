import './build.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const pages = new Map([['/', 'index.html'], ['/index.html', 'index.html'], ['/buyer.html', 'buyer.html'], ['/auth-demo.js', 'auth-demo.js'], ['/demo.html','demo.html'], ['/auth.css','auth.css'], ['/auth-live.bundle.css','auth-live.bundle.css'], ['/auth-live.bundle.js','auth-live.bundle.js']]);
const port = Number(process.env.PORT || 4173);
createServer(async (request, response) => {
  const page = pages.get(new URL(request.url, 'http://localhost').pathname);
  if (!page) { response.writeHead(404); response.end('Not found'); return; }
  try {
    const html = await readFile(new URL(`../dist/${page}`, import.meta.url));
    response.writeHead(200, { 'Content-Type': page.endsWith('.js') ? 'text/javascript; charset=utf-8' : page.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(html);
  } catch { response.writeHead(500); response.end('Page unavailable'); }
}).listen(port, '127.0.0.1', () => console.log(`Fruidges preview: http://127.0.0.1:${port}`));
