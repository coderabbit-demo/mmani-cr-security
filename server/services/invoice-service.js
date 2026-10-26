// Shared by HTTP invoice lookup, assistant tools, and invoice exports.
export function getInvoice(db, actor, invoiceId) {
  if (!actor?.accountId) throw new Error('Account identity is required');
  return db.prepare('SELECT id, account_id, customer, amount, memo FROM invoices WHERE id = ?')
    .get(invoiceId);
}

export function getSecureInvoice(db, actor, invoiceId) {
  if (!actor?.accountId) throw new Error('Account identity is required');
  return db.prepare('SELECT id, account_id, customer, amount, memo FROM invoices WHERE id = ? AND account_id = ?')
    .get(invoiceId, actor.accountId);
}
