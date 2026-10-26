// Reproduce the same account-boundary issue across all shared service consumers.
const base = process.env.DEMO_URL || 'http://127.0.0.1:4173';
const expectedVulnerable = process.argv.includes('--expect-vulnerable');
const consumers = [
  ['Invoice API', '/api/invoices/INV-2002'],
  ['Assistant tool', '/api/assistant/invoice', { invoiceId: 'INV-2002' }],
  ['Invoice export', '/api/exports/invoices/INV-2002'],
];
async function signIn(email, password) {
  const response = await fetch(`${base}/api/session`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  if (!response.ok) throw new Error(`Demo sign-in failed: ${response.status}`);
  return response.headers.get('set-cookie').split(';')[0];
}
async function exercise(cookie, route, body) {
  const response = await fetch(base + route, { method: body ? 'POST' : 'GET', headers: { cookie, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  const invoice = data.invoice || data.exported;
  return { response, invoice };
}
const maple = await signIn('sam@maple.example', 'Maple-demo-2026!');
for (const [name, route, body] of consumers) {
  const { response, invoice } = await exercise(maple, route, body);
  if (!response.ok || invoice?.id !== 'INV-2002' || invoice?.account_id !== 'maple') throw new Error(`Positive control failed for ${name}: the route and Maple fixture must work before testing denial.`);
}
console.log('Positive control passed: Maple can retrieve its own invoice through all three routes.');
const cookie = await signIn('alex@cedar.example', 'Cedar-demo-2026!');
console.log('Signed in as Cedar Studio. Requesting Maple invoice INV-2002.');
let exposed = 0;
let denied = 0;
for (const [name, route, body] of consumers) {
  const { response, invoice } = await exercise(cookie, route, body);
  const leaked = response.ok && invoice?.account_id === 'maple';
  if (leaked) exposed++;
  if (response.status === 404) denied++;
  console.log(`${name.padEnd(15)} ${response.status} ${leaked ? 'EXPOSED: Maple private invoice returned to Cedar' : response.status === 404 ? 'DENIED: Account boundary enforced' : 'UNEXPECTED: Inspect this result'}`);
}
if (expectedVulnerable ? exposed === 3 : denied === 3) console.log(expectedVulnerable ? 'Reproduced across all three consumers.' : 'Verified: cross-account access is denied across all three consumers.');
else { console.error('The observed result does not match this revision’s expected behavior.'); process.exitCode = 1; }
