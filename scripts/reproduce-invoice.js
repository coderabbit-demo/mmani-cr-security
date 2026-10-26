// Reproduce the same account-boundary issue across all shared service consumers.
const base = process.env.DEMO_URL || 'http://127.0.0.1:4173';
const expectedVulnerable = process.argv.includes('--expect-vulnerable');
const login = await fetch(`${base}/api/session`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'alex@cedar.example', password: 'Cedar-demo-2026!' }) });
if (!login.ok) throw new Error(`Demo sign-in failed: ${login.status}`);
const cookie = login.headers.get('set-cookie').split(';')[0];
console.log('Signed in as Cedar Studio. Requesting Maple invoice INV-2002.');
let exposed = 0;
for (const [name, route, body] of [
  ['Invoice API', '/api/invoices/INV-2002'],
  ['Assistant tool', '/api/assistant/invoice', { invoiceId: 'INV-2002' }],
  ['Invoice export', '/api/exports/invoices/INV-2002'],
]) {
  const response = await fetch(base + route, { method: body ? 'POST' : 'GET', headers: { cookie, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  const invoice = data.invoice || data.exported;
  const leaked = response.ok && invoice?.account_id === 'maple';
  if (leaked) exposed++;
  console.log(`${name.padEnd(15)} ${response.status} ${leaked ? 'EXPOSED: Maple private invoice returned to Cedar' : response.status === 404 ? 'DENIED: Account boundary enforced' : 'UNEXPECTED: Inspect this result'}`);
}
if (expectedVulnerable ? exposed === 3 : exposed === 0) console.log(expectedVulnerable ? 'Reproduced across all three consumers.' : 'Verified: cross-account access is denied across all three consumers.');
else { console.error('The observed result does not match this revision’s expected behavior.'); process.exitCode = 1; }
