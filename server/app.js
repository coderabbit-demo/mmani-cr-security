import express from 'express';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { createStore, demoUsers } from './store.js';
import { catalog, publicCatalog } from './catalog.js';
import { getInvoice, getSecureInvoice } from './services/invoice-service.js';

export function createApp(store = createStore()) {
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    if (!['localhost', '127.0.0.1', '[::1]'].includes(req.hostname)) return res.status(403).json({ error: 'Use the local loopback address for this lab.' });
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'no-referrer');
    res.set('Cache-Control', 'no-store');
    if (req.headers.origin) {
      try {
        if (new URL(req.headers.origin).host !== req.headers.host) return res.status(403).json({ error: 'Only same-origin requests are accepted.' });
      } catch { return res.status(403).json({ error: 'Invalid origin.' }); }
    }
    next();
  });
  app.use(express.json({ limit: '32kb' }));
  app.get('/api/health', (req, res) => res.json({ status: 'ok', lab: true }));
  app.post('/api/session', (req, res) => {
    const user = store.db.prepare('SELECT * FROM users WHERE email = ?').get(String(req.body.email || ''));
    const password = String(req.body.password || '');
    if (!user || password.length > 200 || !timingSafeEqual(scryptSync(password, user.salt, 32), Buffer.from(user.password_hash, 'hex'))) return res.status(401).json({ error: 'Invalid demo sign-in.' });
    const actor = demoUsers.find(u => u.id === user.id);
    const token = randomBytes(32).toString('hex');
    const old = req.headers.cookie?.match(/(?:^|;\s*)harbor_session=([a-f0-9]+)/)?.[1];
    if (old) store.state.sessions.delete(old);
    store.state.sessions.set(token, { id: actor.id, accountId: actor.accountId, name: actor.name, company: actor.company, expires: Date.now() + 3600000 });
    res.cookie('harbor_session', token, { httpOnly: true, sameSite: 'strict', maxAge: 3600000 });
    res.json({ actor: { id: actor.id, accountId: actor.accountId, name: actor.name, company: actor.company } });
  });
  app.use('/api', (req, res, next) => {
    const token = req.headers.cookie?.match(/(?:^|;\s*)harbor_session=([a-f0-9]+)/)?.[1];
    const actor = store.state.sessions.get(token);
    if (!actor || actor.expires < Date.now()) return res.status(401).json({ error: 'Sign in with a demo account.' });
    req.actor = actor; next();
  });
  app.get('/api/me', (req, res) => res.json({ actor: req.actor }));
  app.get('/api/catalog', (req, res) => res.json({ lessons: publicCatalog(), revision: process.env.DEMO_REVISION || 'working-tree' }));
  app.post('/api/reset', (req, res) => { store.reset(); res.json({ reset: true }); });

  app.get('/api/invoices/:id', (req, res) => {
    const invoice = getInvoice(store.db, req.actor, req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found in this account.' });
    res.json({ invoice });
  });
  app.post('/api/assistant/invoice', (req, res) => {
    const invoice = getInvoice(store.db, req.actor, String(req.body.invoiceId || ''));
    if (!invoice) return res.status(404).json({ error: 'The assistant cannot access that invoice.' });
    res.json({ tool: 'read_invoice', invoice });
  });
  app.get('/api/exports/invoices/:id', (req, res) => {
    const invoice = getInvoice(store.db, req.actor, req.params.id);
    if (!invoice) return res.status(404).json({ error: 'No export is available for that invoice.' });
    res.set('Content-Disposition', 'attachment; filename="invoice.json"').json({ exported: invoice });
  });
  app.post('/api/labs/:id/:variant', async (req, res) => {
    const lesson = catalog.find(item => item.id === req.params.id);
    if (!lesson || !['insecure', 'secure'].includes(req.params.variant)) return res.status(404).json({ error: 'Lesson not found.' });
    const secure = req.params.variant === 'secure';
    const input = { ...lesson.defaults, ...req.body };
    let data;
    if (lesson.id === 'invoice-access') {
      const fn = secure ? getSecureInvoice : getInvoice;
      const invoice = fn(store.db, req.actor, String(input.invoiceId));
      data = invoice ? { invoice, accessedFromAccount: req.actor.accountId } : { denied: true, reason: 'This invoice belongs to another account. Access was denied.' };
    } else data = await lesson.handlers[secure ? 1 : 0]({ ...store, actor: req.actor, input });
    res.json({ variant: req.params.variant, lesson: lesson.id, data, file: lesson.file, function: lesson.handlers[secure ? 1 : 0].name, observedAt: new Date().toISOString() });
  });
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    res.status(err.type === 'entity.parse.failed' ? 400 : 422).json({ error: 'The request could not be processed. Check the lesson input.' });
  });
  return { app, store };
}
