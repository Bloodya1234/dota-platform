// https-server.js
import { createServer } from 'https';
import { parse } from 'url';
import next from 'next';
import fs from 'fs';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(httpsOptions, (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(3000, () => {
if (process.env.NODE_ENV !== "production") {
  console.log('> 🔒 HTTPS Ready on https://localhost:3000');
  // здесь твой https.createServer(...)
}

  });
});
