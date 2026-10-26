import sanitizeHtml from 'sanitize-html';
import { draftFromTicket, planRefund, generatedReply } from '../ai/model-adapter.js';

export function promptInsecure({ input, state }) {
  const tool = draftFromTicket(input.ticket);
  if (tool.name === 'send_transcript') state.outbox.push({ destination: tool.destination, transcript: 'Synthetic customer support transcript: invoice renewal details.' });
  return { modelRequest: tool, outbox: state.outbox, note: 'Outbox delivery is local. No network request is sent.' };
}
export function promptSecure({ input, state }) {
  const tool = draftFromTicket(input.ticket);
  if (tool.name !== 'reply' || tool.destination !== 'customer') return { denied: true, reason: 'Ticket text cannot grant a new tool or destination.', rejectedRequest: tool };
  return { message: tool.message, outbox: state.outbox };
}

export function disclosureInsecure({ db, actor, state }) {
  const record = db.prepare('SELECT * FROM invoices WHERE account_id = ? LIMIT 1').get(actor.accountId);
  const context = { ...record, integrationToken: 'DEMO-ONLY-AI-TOKEN' };
  state.events.push({ event: 'model_context', context });
  return { sentToModel: context, logged: state.events.at(-1) };
}
export function disclosureSecure({ db, actor, state }) {
  const record = db.prepare('SELECT id, amount, paid FROM invoices WHERE account_id = ? LIMIT 1').get(actor.accountId);
  state.events.push({ event: 'model_request', account: actor.accountId, fields: ['id', 'amount', 'paid'] });
  return { sentToModel: record, logged: state.events.at(-1) };
}

export function outputInsecure({ input }) { return { html: generatedReply(input.html), preview: true, message: 'Untrusted model HTML is passed to the training preview.' }; }
export function outputSecure({ input }) {
  return { html: sanitizeHtml(generatedReply(input.html), { allowedTags: ['p', 'strong', 'em', 'ul', 'li'], allowedAttributes: {} }), preview: true, message: 'Only approved formatting is retained. The secure preview also disables scripts.' };
}

export function agencyInsecure({ actor, input, state }) {
  const tool = planRefund(input.amount);
  const refund = { account: actor.accountId, amount: tool.amount, approved: true, source: 'model_request' };
  state.outbox.push(refund);
  return { refund, note: 'Synthetic refund ledger only. No payment provider is called.' };
}
export function agencySecure({ actor, input, state }) {
  const tool = planRefund(input.amount);
  if (!Number.isSafeInteger(tool.amount) || tool.amount <= 0 || tool.amount > 5000) return { denied: true, reason: 'The assistant can refund at most $50. Larger refunds require a separate authorized approval.' };
  const refund = { account: actor.accountId, amount: tool.amount, approved: true, source: 'server_policy' };
  state.outbox.push(refund);
  return { refund };
}

export function retrievalInsecure({ db, input }) {
  return { documents: db.prepare('SELECT id, account_id, title, body FROM documents WHERE body LIKE ?').all(`%${input.query}%`) };
}
export function retrievalSecure({ db, actor, input }) {
  return { documents: db.prepare('SELECT id, account_id, title, body FROM documents WHERE account_id = ? AND body LIKE ?').all(actor.accountId, `%${input.query}%`) };
}
