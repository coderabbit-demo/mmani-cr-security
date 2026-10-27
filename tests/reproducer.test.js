import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

test('reproducer rejects missing routes instead of reporting verified denial', async () => {
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/api/session') { res.setHeader('Set-Cookie', 'harbor_session=synthetic'); res.end('{}'); }
    else { res.statusCode = 404; res.end('{"error":"route missing"}'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    await assert.rejects(promisify(execFile)(process.execPath, ['scripts/reproduce-invoice.js'], { env: { ...process.env, DEMO_URL: `http://127.0.0.1:${server.address().port}` } }), err => err.code !== 0 && err.stderr.includes('Positive control failed'));
  } finally { await new Promise(resolve => server.close(resolve)); }
});
