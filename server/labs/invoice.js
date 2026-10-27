// Intentional teaching example. Normal invoice routes use the shared service.
export function getInsecureInvoice(db, actor, invoiceId) {
  if (!actor?.accountId) throw new Error('Account identity is required');
  return db.prepare('SELECT id, account_id, customer, amount, memo FROM invoices WHERE id = ?')
    .get(invoiceId);
}
