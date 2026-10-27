import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Anchor, ArrowRight, BookOpen, Check, ChevronDown, ChevronRight, Code2, ExternalLink, FileText, FlaskConical, GitPullRequest, LockKeyhole, Play, RotateCcw, Search, ShieldCheck, ShieldAlert, Workflow } from 'lucide-react';
import './styles.css';

async function request(url, body) {
  const response = await fetch(url, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'The request failed.');
  return data;
}
const accounts = {
  cedar: { email: 'alex@cedar.example', password: 'Cedar-demo-2026!' },
  maple: { email: 'sam@maple.example', password: 'Maple-demo-2026!' },
};

function App() {
  const [lessons, setLessons] = useState([]);
  const [actor, setActor] = useState(null);
  const [selected, setSelected] = useState(location.hash.slice(1) || 'invoice-access');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [tab, setTab] = useState('lesson');
  const [form, setForm] = useState({});
  const [results, setResults] = useState({});
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [present, setPresent] = useState(false);
  const requestEpoch = useRef(0);
  const operationId = useRef(0);

  async function signIn(account) {
    const operation = ++operationId.current;
    requestEpoch.current++;
    setBusy('session'); setError('');
    try {
      const session = await request('/api/session', accounts[account]);
      const data = await request('/api/catalog');
      setActor(session.actor); setLessons(data.lessons); setResults({});
    } catch (e) { if (operation === operationId.current) setError(e.message); } finally { if (operation === operationId.current) setBusy(''); }
  }
  useEffect(() => { signIn('cedar'); }, []);
  const lesson = lessons.find(item => item.id === selected) || lessons[0];
  useEffect(() => { requestEpoch.current++; if (busy !== 'session') { operationId.current++; setBusy(''); } if (lesson) { setForm(lesson.defaults); setResults({}); setError(''); location.hash = lesson.id; } }, [lesson?.id, actor?.accountId]);
  useEffect(() => { document.documentElement.classList.toggle('presentation', present); }, [present]);
  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(''), 2600); return () => clearTimeout(timer); } }, [toast]);

  async function run(variant) {
    const operation = ++operationId.current;
    const epoch = requestEpoch.current;
    setBusy(variant); setError('');
    try { const result = await request(`/api/labs/${lesson.id}/${variant}`, form); if (epoch === requestEpoch.current) setResults(previous => ({ ...previous, [variant]: result })); }
    catch (e) { if (epoch === requestEpoch.current) setError(e.message); } finally { if (operation === operationId.current) setBusy(''); }
  }
  async function reset() {
    try { await request('/api/reset', {}); setResults({}); setToast('Demo data reset. Both accounts are ready.'); }
    catch (e) { setError(e.message); }
  }
  const shown = lessons.filter(item => (filter === 'All' || item.category === filter) && `${item.title} ${item.mapping}`.toLowerCase().includes(query.toLowerCase()));

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#invoice-access" onClick={() => { setSelected('invoice-access'); setTab('lesson'); }}><span className="brand-mark"><Anchor size={25}/></span><span>Harbor<span className="brand-sub">Support workspace</span></span></a>
      <div className="lab-label"><FlaskConical size={16}/><span>Security learning lab</span></div>
      <div className="nav-title">Explore the lessons <span>{lessons.length}</span></div>
      <label className="search"><Search size={16}/><input aria-label="Search lessons" placeholder="Find a lesson" value={query} onChange={e => setQuery(e.target.value)}/></label>
      <div className="filters" aria-label="Lesson category">{['All', 'Web', 'AI'].map(value => <button key={value} aria-pressed={filter === value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{value}</button>)}</div>
      <nav aria-label="Security lessons">{shown.map((item, i) => <button key={item.id} className={`lesson-link ${selected === item.id ? 'selected' : ''}`} onClick={() => { setSelected(item.id); setTab('lesson'); }}><span className="lesson-number">{String(lessons.indexOf(item) + 1).padStart(2, '0')}</span><span>{item.title}</span>{selected === item.id && <ChevronRight size={16}/>}</button>)}</nav>
      {shown.length === 0 && <p className="empty-nav">No matching lessons.</p>}
      <div className="sidebar-bottom"><ShieldCheck size={18}/><span>Synthetic data only<br/><small>Runs on your local machine</small></span></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><div className="breadcrumb">Harbor Support <ChevronRight size={14}/> <strong>Security lab</strong></div><div className="top-actions"><span className="local-status"><span/> Local environment</span><button className={`text-button ${present ? 'is-on' : ''}`} onClick={() => setPresent(!present)} aria-pressed={present}>Large type</button><div className="account"><span className="avatar">{actor?.name?.split(' ').map(n => n[0]).join('') || '…'}</span><label><span className="sr-only">Demo account</span><select disabled={busy === 'session'} value={actor?.accountId || 'cedar'} onChange={e => signIn(e.target.value)}><option value="cedar">Cedar Studio</option><option value="maple">Maple Works</option></select></label></div></div></header>
      <main id="main">
        <div className="section-nav"><div role="tablist" aria-label="Workspace views"><button role="tab" aria-selected={tab === 'lesson'} className={tab === 'lesson' ? 'active' : ''} onClick={() => setTab('lesson')}><BookOpen size={17}/>Compare implementations</button><button role="tab" aria-selected={tab === 'flow'} className={tab === 'flow' ? 'active' : ''} onClick={() => setTab('flow')}><Workflow size={17}/>Follow the demo story</button></div><button className="text-button reset" onClick={reset}><RotateCcw size={15}/>Reset demo data</button></div>
        {error && <div className="error" role="alert">{error}<button onClick={() => signIn(actor?.accountId || 'cedar')}>Reconnect</button></div>}
        {!lesson ? <div className="loading"><Anchor size={32}/><p>Preparing your local workspace…</p></div> : tab === 'flow' ? <Story/> : <>
          <div className="lesson-heading"><div className="lesson-meta"><span className="category">{lesson.category === 'AI' ? 'AI application' : 'Web application'}</span><span>{lesson.mapping}</span></div><h1>{lesson.title}</h1><p className="intro">{lesson.summary}</p></div>
          {lesson.id === 'invoice-access' && <div className="account-context"><div><span className="company-icon">C</span><span><small>Signed in to</small><strong>{actor?.company}</strong></span></div><ArrowRight size={20}/><div><FileText size={25}/><span><small>Requested invoice</small><strong>INV-2002 · Maple Works</strong></span></div><div className="boundary"><LockKeyhole size={16}/> Separate customer accounts</div></div>}
          {lesson.id === 'invoice-access' && <p className="comparison-context">This comparison keeps an insecure teaching example available after the repair. The invoice API, assistant, and export use the shared service. To compare account access, sign in as Cedar and request Maple invoice INV-2002.</p>}
          {lesson.fields.length > 0 && <form className="request-form" onSubmit={e => e.preventDefault()}><div className="form-title">Prepare the same request for both versions</div><div className="fields">{lesson.fields.map(field => <label key={field.key}>{field.label}{field.type === 'textarea' ? <textarea spellCheck="false" value={form[field.key] ?? ''} onChange={e => setForm({ ...form, [field.key]: e.target.value })}/> : <input type={field.type} spellCheck="false" value={form[field.key] ?? ''} onChange={e => setForm({ ...form, [field.key]: e.target.value })}/>}</label>)}</div></form>}
          <div className="comparison">{['insecure', 'secure'].map((variant, index) => <section className={`implementation ${variant}`} key={variant} aria-label={`${variant} implementation`}><div className="implementation-top"><span className="version-icon">{index ? <ShieldCheck size={22}/> : <ShieldAlert size={22}/>}</span><div><h2>{index ? 'Secure version' : 'Insecure version'}</h2><span>{index ? 'Control enforced in code' : 'Inspect the missing control'}</span></div><span className="variant-tag">{index ? 'Protected' : 'Investigate'}</span></div><p className="version-description">{lesson[variant]}</p><button className={`run-button ${index ? 'safe' : 'unsafe'}`} disabled={!!busy} onClick={() => run(variant)}><Play size={16} fill="currentColor"/>{busy === variant ? 'Running request…' : `Run ${variant} request`}<ArrowRight size={17}/></button><Result result={results[variant]} variant={variant}/><details className="source"><summary><Code2 size={16}/>View running source<ChevronDown size={16}/></summary><div className="source-path">{lesson.files[index]}</div><pre><code>{lesson.code[index]}</code></pre></details></section>)}</div>
          <section className="explanation"><div><h2>What to notice</h2><p>{lesson.id === 'invoice-access' ? 'A valid sign-in proves who the user is. It does not prove that the user owns the requested invoice. The ownership check belongs in the shared service so every caller gets the same protection.' : `${lesson.insecure} ${lesson.secure}`}</p></div><div className="classification"><span>Security reference</span><strong>{lesson.cwe}</strong><small>Target weakness for this lesson.<br/>Actual review labels may differ.</small></div></section>
          {lesson.id === 'invoice-access' && <section className="shared-path"><div><h2>One shared service. Three ways in.</h2><p>Trace the same account boundary through each consumer.</p></div><div className="path-diagram"><div className="callers"><span>Invoice API</span><span>Assistant tool</span><span>Invoice export</span></div><ArrowRight/><span className="service-node">Invoice service<br/><small>Account ownership check</small></span><ArrowRight/><span className="database-node">Invoice records<br/><small>Cedar · Maple</small></span></div></section>}
          <div className="lab-footer"><FlaskConical size={15}/><span>Lesson results come from this local application. CodeRabbit review and scan findings appear in CodeRabbit.</span><a href="https://github.com/coderabbit-demo/mmani-cr-security" target="_blank" rel="noreferrer">View repository<ExternalLink size={13}/></a></div>
        </>}
      </main>
    </div>
    {toast && <div className="toast" role="status"><Check size={18}/>{toast}</div>}
  </div>;
}

function Result({ result, variant }) {
  if (!result) return <div className="result placeholder"><span className="result-label">Request result</span><p>Run the request to see what this version returns.</p><div className="placeholder-lines"><span/><span/></div></div>;
  const denied = result.data.denied;
  const exposed = Boolean(result.data.accessedFromAccount && result.data.invoice && result.data.invoice.account_id !== result.data.accessedFromAccount);
  const iframeCsp = variant === 'insecure' ? "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:" : "default-src 'none'; style-src 'unsafe-inline'";
  return <div className={`result ${denied ? 'denied' : exposed ? 'exposed' : 'completed'}`} aria-live="polite"><div className="result-header"><span className="result-label">Request result</span><span className={`result-state ${denied ? 'blocked' : exposed ? 'exposed' : ''}`}>{denied ? <LockKeyhole size={14}/> : exposed ? <ShieldAlert size={14}/> : <Check size={14}/>} {denied ? 'Access denied' : exposed ? 'Cross-account data exposed' : 'Request completed'}</span></div>{exposed && <p>An invoice from another account was returned.</p>}{denied && <p className="denial-message">{result.data.reason}</p>}{result.data.preview && <iframe title={`${variant} AI reply preview`} sandbox={variant === 'insecure' ? 'allow-scripts' : ''} referrerPolicy="no-referrer" srcDoc={`<!doctype html><meta http-equiv="Content-Security-Policy" content="${iframeCsp}"><style>body{font:16px system-ui;padding:14px;color:#17354a}h2{font-size:20px}</style>${result.data.html}`}/>}<pre><code>{JSON.stringify(result.data, null, 2)}</code></pre></div>;
}

function Story() {
  const steps = [
    ['Local review', 'Introduce the invoice regression. Run the CodeRabbit CLI before you push.', 'Terminal'],
    ['Pull request review', 'Open the PR. Inspect the invoice finding and its code evidence.', 'GitHub'],
    ['Architecture and blast radius', 'Follow the account boundary across the API, assistant, shared service, and export.', 'CodeRabbit Change Stack'],
    ['Security check', 'Inspect the native Security check and confirm the actual merge rule.', 'GitHub Checks'],
    ['Create a Jira ticket', 'Ask @coderabbitai in the PR to open a ticket with the finding context. Follow its returned link.', 'PR agent → Jira'],
    ['Deep Scan and attack surface', 'Scan the committed regression branch. Find the same defect and its mapped code paths.', 'CodeRabbit Security'],
    ['Runtime verification', 'Generate the reproducer, execute it, and inspect the tested revision and retained evidence.', 'CodeRabbit Security'],
    ['Remediate and triage', 'Fix the shared service. Verify all callers, re-review, and inspect the finding status. Dismiss a separate accepted lab risk.', 'PR → Security'],
  ];
  return <><div className="lesson-heading"><div className="lesson-meta"><span className="category">Presenter guide</span><span>One finding from discovery to fix</span></div><h1>Follow the invoice access story</h1><p className="intro">Start with a customer task. Keep the same missing account check in view as the evidence grows.</p></div><div className="story-list">{steps.map(([title, detail, place], index) => <section className="story-step" key={title}><span className="step-index">{index + 1}</span><div><h2>{title}</h2><p>{detail}</p></div><span className="step-place">{place}</span></section>)}</div><div className="story-note"><GitPullRequest size={22}/><p>Use actual review links, scan results, and Jira issues during the presentation. This page describes the sequence; it does not simulate CodeRabbit output.</p></div></>;
}

createRoot(document.getElementById('root')).render(<App/>);
