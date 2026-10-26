import { randomBytes, createCipheriv, timingSafeEqual } from 'node:crypto';
import { sign } from '../store.js';

export function debugInsecure({ state }) {
  return { config: { connectorKey: 'DEMO-ONLY-CONNECTOR-KEY', database: 'memory://harbor', mode: 'debug' }, stack: 'BillingConnector > InvoiceService > Database' };
}
export function debugSecure() { return { status: 'ok', service: 'Harbor Support' }; }

export function connectorInsecure({ input }) {
  const connector = { demoToken: 'DEMO-ONLY-CONNECTOR-KEY', invoiceCount: 2 };
  const fields = { 'connector.demoToken': connector.demoToken, 'connector.invoiceCount': connector.invoiceCount };
  if (!Object.hasOwn(fields, input.code)) return { denied: true, reason: 'Only the two teaching connector operations are supported.' };
  return { result: fields[input.code], provenance: 'Connector artifact was accepted without a signature' };
}
export function connectorSecure({ input, state }) {
  const approvedSource = 'connector.invoiceCount';
  const supplied = Buffer.from(String(input.signature || ''), 'hex');
  const expected = Buffer.from(sign(state, input.code), 'hex');
  if (input.code !== approvedSource || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return { denied: true, reason: 'Connector source and signature must match an approved artifact.' };
  }
  return { result: 2, provenance: 'Approved artifact signature verified' };
}

export function cryptoInsecure({ input }) {
  const stored = Buffer.from(input.value).toString('base64');
  return { stored, recoveredWithoutKey: Buffer.from(stored, 'base64').toString(), protection: 'Base64 encoding' };
}
export function cryptoSecure({ input, state }) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', state.key, iv);
  const encrypted = Buffer.concat([cipher.update(input.value, 'utf8'), cipher.final()]);
  return { stored: encrypted.toString('hex'), nonce: iv.toString('hex'), tag: cipher.getAuthTag().toString('hex'), protection: 'Authenticated encryption. The key is held outside the database.' };
}

export function searchInsecure({ db, actor, input }) {
  const sql = `SELECT id, customer, amount, account_id FROM invoices WHERE account_id = '${actor.accountId}' AND memo LIKE '%${input.query}%'`;
  return { rows: db.prepare(sql).all(), query: sql };
}
export function searchSecure({ db, actor, input }) {
  const sql = 'SELECT id, customer, amount, account_id FROM invoices WHERE account_id = ? AND memo LIKE ?';
  return { rows: db.prepare(sql).all(actor.accountId, `%${String(input.query).slice(0, 120)}%`), query: sql };
}

export function refundInsecure({ db, actor, state, input }) {
  const invoice = db.prepare('SELECT * FROM invoices WHERE account_id = ? ORDER BY id LIMIT 1').get(actor.accountId);
  if (!invoice) return { denied: true, reason: 'Invoice is not in your account.' };
  const payment = { id: randomBytes(4).toString('hex'), amount: Number(input.amount) };
  const previous = state.refunds.get('unsafe') || [];
  previous.push(payment); state.refunds.set('unsafe', previous);
  return { payments: previous, totalRefunded: previous.reduce((sum, p) => sum + p.amount, 0), invoiceAmount: invoice.amount };
}
export function refundSecure({ db, actor, state, input }) {
  const invoice = db.prepare('SELECT * FROM invoices WHERE account_id = ? ORDER BY id LIMIT 1').get(actor.accountId);
  if (!invoice) return { denied: true, reason: 'Invoice is not in your account.' };
  const amount = Number(input.amount);
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > invoice.amount) return { denied: true, reason: 'Refund must fit the paid invoice amount.' };
  const key = `${actor.accountId}:${String(input.requestKey)}`;
  const previous = state.refunds.get(key);
  if (previous) return { payment: previous, duplicateIgnored: true };
  const total = [...state.refunds.entries()].filter(([k]) => k.startsWith(`${actor.accountId}:`)).reduce((sum, [, p]) => sum + p.amount, 0);
  if (total + amount > invoice.amount) return { denied: true, reason: 'Cumulative refunds exceed the invoice amount.' };
  // This single-process, synchronous operation has no await between check and write.
  const payment = { id: randomBytes(4).toString('hex'), amount };
  state.refunds.set(key, payment);
  return { payment, duplicateIgnored: false };
}

export function resetInsecure({ actor, input }) {
  const token = `reset-${actor.id}`;
  return { token, reusable: true, acceptedToken: input.token === token, expires: 'Never' };
}
export function resetSecure({ actor, state, input }) {
  if (input.token) {
    const item = state.resetTokens.get(input.token);
    if (!item || item.user !== actor.id || item.expires < Date.now()) return { denied: true, reason: 'Token is invalid, expired, or already used.' };
    state.resetTokens.delete(input.token);
    return { changed: true, singleUse: true };
  }
  const token = randomBytes(32).toString('hex');
  state.resetTokens.set(token, { user: actor.id, expires: Date.now() + 300000 });
  // Synthetic outbox only. This token is returned to the lab so users can exercise one-time use.
  return { delivery: 'Local demo outbox', token, expiresInSeconds: 300, singleUse: true };
}

export function webhookInsecure({ db, actor, input }) {
  db.prepare('UPDATE invoices SET paid = 1 WHERE id = ? AND account_id = ?').run(input.invoiceId, actor.accountId);
  return { paid: true, verification: 'Event body trusted without a signature' };
}
export function webhookSecure({ db, actor, state, input }) {
  const body = JSON.stringify({ invoiceId: input.invoiceId, eventId: input.eventId, timestamp: input.timestamp });
  const supplied = Buffer.from(String(input.signature || ''), 'hex');
  const expected = Buffer.from(sign(state, body), 'hex');
  if (!Number.isFinite(input.timestamp) || Math.abs(Date.now() - input.timestamp) > 300000 || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return { denied: true, reason: 'Valid signature and recent timestamp are required.' };
  const eventKey = `event:${actor.accountId}:${input.eventId}`;
  if (state.refunds.has(eventKey)) return { denied: true, reason: 'Event already processed.' };
  const invoice = db.prepare('SELECT id FROM invoices WHERE id = ? AND account_id = ?').get(input.invoiceId, actor.accountId);
  if (!invoice) return { denied: true, reason: 'Invoice is not in your account.' };
  db.prepare('UPDATE invoices SET paid = 1 WHERE id = ? AND account_id = ?').run(input.invoiceId, actor.accountId);
  state.refunds.set(eventKey, { amount: 0 });
  return { paid: true, verification: 'Signature, freshness, account, and replay checks passed' };
}

export function auditInsecure({ db, actor }) {
  let deniedAttempts = 0;
  const foreignId = actor.accountId === 'cedar' ? 'INV-2002' : 'INV-1001';
  for (let i = 0; i < 5; i++) {
    const invoice = db.prepare('SELECT id FROM invoices WHERE id = ? AND account_id = ?').get(foreignId, actor.accountId);
    if (!invoice) deniedAttempts++;
  }
  return { deniedAttempts, auditEvents: [], alerts: [], result: 'Forbidden invoice requests left no audit record.' };
}
export function auditSecure({ db, actor, state }) {
  const foreignId = actor.accountId === 'cedar' ? 'INV-2002' : 'INV-1001';
  const events = [];
  for (let i = 0; i < 5; i++) {
    const invoice = db.prepare('SELECT id FROM invoices WHERE id = ? AND account_id = ?').get(foreignId, actor.accountId);
    if (!invoice) {
      const event = { event: 'invoice_access_denied', account: actor.accountId, user: actor.id, requestId: randomBytes(4).toString('hex'), time: new Date().toISOString() };
      state.events.push(event); events.push(event);
    }
  }
  const alerts = events.length >= 5 ? [{ event: 'repeated_access_denied', count: events.length }] : [];
  return { auditEvents: events, alerts, result: 'Denied requests have safe audit records and an alert.' };
}

export function failureInsecure({ db, actor }) {
  let allowed;
  try { throw new Error('Permission service timed out'); } catch { allowed = true; }
  return allowed ? { exported: db.prepare('SELECT id, customer, amount FROM invoices WHERE account_id = ?').all(actor.accountId), policy: 'Unavailable; defaulted to allow' } : { denied: true };
}
export function failureSecure() {
  try { throw new Error('Permission service timed out'); } catch { return { denied: true, reason: 'The permission decision is unavailable. No export was created.' }; }
}
