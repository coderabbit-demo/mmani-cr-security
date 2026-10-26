import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../server/app.js';
import { demoUsers, sign } from '../server/store.js';

let base, server, store, cookie;
async function call(url, body, auth = cookie) {
  const response = await fetch(base + url, { method: body === undefined ? 'GET' : 'POST', headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(auth ? { cookie: auth } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { response, data: await response.json() };
}
async function run(id, variant, input = {}) { return (await call(`/api/labs/${id}/${variant}`, input)).data.data; }
before(async () => {
  const created = createApp(); store = created.store;
  server = await new Promise(resolve => { const s = created.app.listen(0, '127.0.0.1', () => resolve(s)); });
  base = `http://127.0.0.1:${server.address().port}`;
  const { response } = await call('/api/session', demoUsers[0], '');
  cookie = response.headers.get('set-cookie').split(';')[0];
});
after(async () => { if (server) await new Promise(resolve => server.close(resolve)); store?.close(); });
beforeEach(() => store.reset());

test('private routes require a session and reject foreign origins and hosts', async () => {
  assert.equal((await call('/api/catalog', undefined, '')).response.status, 401);
  const response = await fetch(base + '/api/reset', { method: 'POST', headers: { cookie, Origin: 'https://attacker.example' } });
  assert.equal(response.status, 403);
  const hostStatus = await new Promise((resolve, reject) => {
    http.get(base + '/api/health', { headers: { Host: 'attacker.example' } }, res => { res.resume(); resolve(res.statusCode); }).on('error', reject);
  });
  assert.equal(hostStatus, 403);
});
test('catalog serves fifteen real source pairs', async () => {
  const { data } = await call('/api/catalog');
  assert.equal(data.lessons.length, 15);
  assert.equal(data.lessons.filter(x => x.category === 'AI').length, 5);
  assert.ok(data.lessons.every(x => x.code.length === 2 && x.code.every(code => code.includes('function'))));
});
test('baseline invoice access protects all consumers and ignores caller account claims', async () => {
  assert.equal((await call('/api/invoices/INV-1001')).response.status, 200);
  assert.equal((await call('/api/invoices/INV-2002')).response.status, 404);
  assert.equal((await call('/api/assistant/invoice', { invoiceId: 'INV-2002', accountId: 'maple' })).response.status, 404);
  assert.equal((await call('/api/exports/invoices/INV-2002')).response.status, 404);
  assert.equal((await run('invoice-access', 'secure', { invoiceId: 'INV-2002', accountId: 'maple' })).denied, true);
});
test('safe health response contains no debug configuration', async () => {
  assert.ok((await run('debug-exposure', 'insecure')).config.connectorKey);
  assert.deepEqual(await run('debug-exposure', 'secure'), { status: 'ok', service: 'Harbor Support' });
});
test('connector rejects unsigned code and accepts the approved signed artifact', async () => {
  assert.equal((await run('connector-update', 'insecure')).result, 'DEMO-ONLY-CONNECTOR-KEY');
  assert.equal((await run('connector-update', 'secure')).denied, true);
  const code = 'connector.invoiceCount';
  assert.equal((await run('connector-update', 'secure', { code, signature: sign(store.state, code) })).result, 2);
});
test('bank encryption uses a fresh nonce and does not expose the plaintext', async () => {
  assert.equal((await run('bank-encryption', 'insecure')).recoveredWithoutKey, 'DEMO-ACCOUNT-CEDAR-001');
  const one = await run('bank-encryption', 'secure'), two = await run('bank-encryption', 'secure');
  assert.notEqual(one.stored, two.stored); assert.notEqual(one.nonce, two.nonce);
  assert.equal(one.recoveredWithoutKey, undefined); assert.equal(one.tag.length, 32);
});
test('SQL parameters stop the injected account-filter bypass', async () => {
  assert.equal((await run('invoice-search', 'insecure')).rows.length, 2);
  assert.equal((await run('invoice-search', 'secure')).rows.length, 0);
  assert.equal((await run('invoice-search', 'secure', { query: 'support' })).rows[0].account_id, 'cedar');
});
test('refund retries are idempotent and cumulative limits hold', async () => {
  await run('refund-retry', 'insecure');
  assert.equal((await run('refund-retry', 'insecure')).totalRefunded, 96000);
  await run('refund-retry', 'secure');
  assert.equal((await run('refund-retry', 'secure')).duplicateIgnored, true);
  assert.equal((await run('refund-retry', 'secure', { requestKey: 'second' })).denied, true);
  assert.equal((await run('refund-retry', 'secure', { amount: -1 })).denied, true);
});
test('reset token is random, scoped, expiring, and single-use', async () => {
  assert.equal((await run('password-reset', 'insecure')).acceptedToken, true);
  assert.equal((await run('password-reset', 'secure')).denied, true);
  const { token } = await run('password-reset', 'secure', { token: '' });
  assert.equal(token.length, 64);
  assert.equal((await run('password-reset', 'secure', { token })).changed, true);
  assert.equal((await run('password-reset', 'secure', { token })).denied, true);
  const next = await run('password-reset', 'secure', { token: '' });
  store.state.resetTokens.get(next.token).expires = Date.now() - 1;
  assert.equal((await run('password-reset', 'secure', { token: next.token })).denied, true);
});
test('webhook authenticity, freshness, and replay checks protect payment state', async () => {
  assert.equal((await run('payment-webhook', 'secure')).denied, true);
  assert.equal(store.db.prepare('SELECT paid FROM invoices WHERE id = ?').get('INV-1001').paid, 0);
  const input = { invoiceId: 'INV-1001', eventId: 'real-demo-event', timestamp: Date.now() };
  input.signature = sign(store.state, JSON.stringify(input));
  assert.equal((await run('payment-webhook', 'secure', input)).paid, true);
  assert.equal((await run('payment-webhook', 'secure', input)).denied, true);
});
test('denied requests have safe audit events and a threshold alert', async () => {
  assert.equal((await run('security-alerts', 'insecure')).deniedAttempts, 5);
  const safe = await run('security-alerts', 'secure');
  assert.equal(safe.auditEvents.length, 5); assert.equal(safe.alerts.length, 1);
  assert.equal(JSON.stringify(safe).includes('password'), false);
});
test('unavailable policy fails closed', async () => {
  assert.ok((await run('permission-timeout', 'insecure')).exported.length);
  assert.equal((await run('permission-timeout', 'secure')).denied, true);
});
test('ticket instructions cannot authorize a transcript destination', async () => {
  assert.equal((await run('ticket-injection', 'insecure')).outbox[0].destination, 'attacker.example');
  store.reset();
  assert.equal((await run('ticket-injection', 'secure')).denied, true);
  assert.equal(store.state.outbox.length, 0);
});
test('model context and logs contain only required invoice fields', async () => {
  assert.ok((await run('model-disclosure', 'insecure')).sentToModel.bank_details);
  const safe = await run('model-disclosure', 'secure');
  assert.equal(safe.sentToModel.bank_details, undefined);
  assert.equal(safe.sentToModel.integrationToken, undefined);
  assert.deepEqual(Object.keys(safe.sentToModel).sort(), ['amount', 'id', 'paid']);
});
test('AI reply allowlist removes executable markup', async () => {
  assert.ok((await run('reply-html', 'insecure')).html.includes('onerror'));
  const safe = await run('reply-html', 'secure');
  assert.equal(safe.html.includes('onerror'), false); assert.equal(safe.html.includes('<img'), false);
  assert.equal(safe.html, '<p>Your invoice is ready.</p>');
});
test('assistant refund limit is enforced outside the model adapter', async () => {
  assert.equal((await run('refund-agent', 'insecure')).refund.amount, 250000);
  assert.equal((await run('refund-agent', 'secure')).denied, true);
  assert.equal((await run('refund-agent', 'secure', { amount: 5000 })).refund.source, 'server_policy');
});
test('private document retrieval is scoped to the session account', async () => {
  assert.equal((await run('document-retrieval', 'insecure')).documents[0].account_id, 'maple');
  assert.equal((await run('document-retrieval', 'secure')).documents.length, 0);
  assert.equal((await run('document-retrieval', 'secure', { query: 'renewal' })).documents.length, 0);
  assert.equal((await run('document-retrieval', 'secure', { query: 'renew' })).documents[0].account_id, 'cedar');
});
