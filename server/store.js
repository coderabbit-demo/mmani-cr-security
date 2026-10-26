import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync, createHmac } from 'node:crypto';

export const demoUsers = [
  { id: 'user-cedar', email: 'alex@cedar.example', password: 'Cedar-demo-2026!', accountId: 'cedar', name: 'Alex Morgan', company: 'Cedar Studio' },
  { id: 'user-maple', email: 'sam@maple.example', password: 'Maple-demo-2026!', accountId: 'maple', name: 'Sam Rivera', company: 'Maple Works' },
];

export function createStore() {
  const db = new DatabaseSync(':memory:');
  const state = { sessions: new Map(), key: randomBytes(32), resetTokens: new Map(), refunds: new Map(), events: [], outbox: [], resets: 0 };
  db.exec(`
    CREATE TABLE invoices (id TEXT PRIMARY KEY, account_id TEXT NOT NULL, customer TEXT, amount INTEGER, memo TEXT, bank_details TEXT, paid INTEGER DEFAULT 0);
    CREATE TABLE documents (id TEXT PRIMARY KEY, account_id TEXT NOT NULL, title TEXT, body TEXT);
    CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT, account_id TEXT, salt TEXT, password_hash TEXT);
  `);
  const addUser = db.prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?)');
  for (const u of demoUsers) {
    const salt = randomBytes(16).toString('hex');
    addUser.run(u.id, u.email, u.accountId, salt, scryptSync(u.password, salt, 32).toString('hex'));
  }
  function reset() {
    db.exec('DELETE FROM invoices; DELETE FROM documents;');
    const add = db.prepare('INSERT INTO invoices (id, account_id, customer, amount, memo, bank_details) VALUES (?, ?, ?, ?, ?, ?)');
    add.run('INV-1001', 'cedar', 'Cedar Studio', 48000, 'Customer support plan', 'DEMO-ACCOUNT-CEDAR-001');
    add.run('INV-2002', 'maple', 'Maple Works', 125000, 'Private enterprise renewal', 'DEMO-ACCOUNT-MAPLE-002');
    const doc = db.prepare('INSERT INTO documents VALUES (?, ?, ?, ?)');
    doc.run('DOC-C1', 'cedar', 'Cedar renewal notes', 'Cedar support contract renews in December.');
    doc.run('DOC-M2', 'maple', 'Maple private acquisition', 'Maple confidential project: Project Lighthouse. Budget: demo $250,000.');
    state.resetTokens.clear(); state.refunds.clear(); state.events.length = 0; state.outbox.length = 0; state.resets++;
  }
  reset();
  return { db, state, reset, close: () => db.close() };
}

export function sign(state, value) { return createHmac('sha256', state.key).update(value).digest('hex'); }
