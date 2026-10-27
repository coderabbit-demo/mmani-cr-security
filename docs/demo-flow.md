# Harbor Support: CodeRabbit Security demo flow

Follow one missing account check from a CLI review to a pull request, Deep Scan, and repair. The same shared invoice lookup serves the invoice API, assistant invoice tool, and invoice export.

All data is synthetic. The application runs on loopback. AI responses are deterministic. Outbox entries and refunds have local effects only.

## Prepare

Use Node 24.12 or later in the Node 24 line. Install and start the application:

```sh
npm ci
npm run build
npm start
```

Open `http://127.0.0.1:4173`. Select Cedar Studio. Use large type and Reset demo data.

Use these replay tags in a separate checkout, or stop the server before switching revisions:

| Revision | Purpose |
| --- | --- |
| `demo-baseline` / `8bdf5c6` | Application baseline; shared invoice ownership is enforced. |
| `demo-vulnerable` / `c04f5df` | Shared invoice query omits the account predicate. |
| `demo-remediated` / `34872a2` | Merged repair and stronger reproduction controls. Repair commit: `1844ccf`. |

Restart the server after backend changes. The in-memory database resets on restart. Build the UI after switching a tag. The vulnerable tag is needed to show the invoice lesson's insecure result; the repaired shared service also protects that lesson caller.

## Do / Say / See

| Do | Say | See or verify |
| --- | --- | --- |
| Review the uncommitted invoice regression with `coderabbit review --uncommitted --fresh --deep --agent`. | Signing in proves identity. This record still needs an ownership check. | The completed CLI 0.9.1 review reports a Major issue at `server/services/invoice-service.js:4-5`. The recording uses a clearly labeled viewer of saved output, so it does not depend on the presenter's current CLI organization. |
| Open the matching [PR finding](https://github.com/coderabbit-demo/mmani-cr-security/pull/2#discussion_r4383413143). | The same missing check is now visible to the team. | Major, Security & Privacy, IDOR, CWE-639; External reachability, Moderate exploitability. The local demo remains loopback-only. |
| Select View Security blast radius. Inspect the shared service and its callers. | One shared service exposes data through three features. | The graph connects `app.js` to `getInvoice`. Test and related-context edges have separate meanings. Nearby dependencies are not all confirmed vulnerability paths. |
| Expand Security architecture risk in the [PR summary](https://github.com/coderabbit-demo/mmani-cr-security/pull/2#issuecomment-6429275068). | Session checks and SQL parameters still work. Neither checks invoice ownership. | High risk at `c04f5df`. Supported impact is disclosure of selected invoice fields through the existing consumers. The review does not claim writes or access to other systems. |
| Open the failing [CodeRabbit Security check](https://github.com/coderabbit-demo/mmani-cr-security/runs/121898743536). | A required check turns this finding into a merge decision. | One Major finding, zero fixed, one remaining, one blocking. Main protection requires this check from the CodeRabbit app, including administrators. |
| Ask `@coderabbitai` in the PR to open a Bug in the linked Jira project. | The ticket needs enough context for a person who missed this demo. | Include PR, finding, commit, file, impact, reproduction, recommended fix, and acceptance tests. Require an actual returned issue link. Issue creation depends on an approved write-capable connection being exposed to the PR agent. |
| Open completed [Deep Scan 70d07745](https://app.coderabbit.ai/deep-scans/70d07745-88af-4e9e-be83-15ac3c916af8). Select the invoice IDOR. | A repository scan independently traces the same account-boundary defect. | The original scan reported 10 findings: 3 Medium and 7 Low. The IDOR is Medium at the same source lines, CWE-639, with API, assistant, export, and lesson callers. PR and scan severity labels differ; report each as shown. |
| Open Attack surface and select the `getInvoice` sink. Then open Data flow. | Coverage shows which points have evidence. It does not mean every point is safe. | After the first scan: 112 of 112 mapped points verified, with findings still present. The UI also requests more cross-repository evidence for seven points. Do not invent linked systems to fill that gap. |
| Run the local reproducer on the vulnerable tag. | First prove the routes work. Then try the wrong account. | Maple can read its own `INV-2002` through all three routes. Cedar then receives Maple's invoice with HTTP 200 through all three. |
| Inspect [repair commit 1844ccf](https://github.com/coderabbit-demo/mmani-cr-security/commit/1844ccf6826c3a8e8b77b95266fab65e1061bc00). Run tests, build, and the reproducer after restarting. | The shared service owns the policy. Every caller gets the same protection. | The query binds both invoice ID and session-derived account ID. All 21 tests pass; production build passes. Maple's positive control passes; all three Cedar requests return HTTP 404. |
| Open the passing [security check](https://github.com/coderabbit-demo/mmani-cr-security/runs/121950267554). | CodeRabbit verifies the repair before merge. | One Major found, one verified fixed, zero remaining, zero blocking. Resolving a conversation alone does not clear a blocker. [PR #2](https://github.com/coderabbit-demo/mmani-cr-security/pull/2) merged after the required check passed. |
| Inspect a separate prompt-injection lab finding. Dismiss only that finding as Accepted risk. | This accepts a deliberate synthetic lesson. It does not make this pattern safe in a deployed product. | Finding `3b4e3e45-25a5-4988-9b77-241dc4263586`, `server/labs/ai.js:6`. Its effect is a synthetic entry in the local outbox. No network delivery occurs. No learning or path instruction is saved. Revisit if deployment, real data, or external tools change. |

The CLI run contained two findings. A reproducer-control issue was corrected before `c04f5df`; the invoice source defect remained for PR review and Deep Scan. Do not describe the retained output as a new live CLI execution.

## Local runtime verification

The account had no hosted Agent minutes and usage billing was off. The approved recording uses local execution evidence. A source recheck, a generated guide, and an executed runtime test are different kinds of evidence.

On the vulnerable revision:

```sh
node scripts/reproduce-invoice.js --expect-vulnerable
```

After the repair and a server restart:

```sh
node scripts/reproduce-invoice.js
```

| Consumer | Cedar before | Cedar after |
| --- | --- | --- |
| Invoice API | HTTP 200, Maple invoice exposed | HTTP 404, denied |
| Assistant invoice tool | HTTP 200, Maple invoice exposed | HTTP 404, denied |
| Invoice export | HTTP 200, Maple invoice exposed | HTTP 404, denied |

Both runs first require Maple's own-account request to succeed through every route. The missing-route test prevents an unavailable endpoint from being mistaken for a repaired authorization control.

## Review configuration

The checked-in [`.coderabbit.yaml`](../.coderabbit.yaml) was validated against the published schema on 26 October 2026. It enables assertive reviews, draft and incremental reviews, linked-issue assessment, and supported security tools. Path instructions ask for reachable paths, existing controls, counterevidence, supported CWEs, and focused validation. The invoice instructions require review of all shared consumers.

Native Security check thresholds, GitHub branch protection, Deep Scan targets, runtime settings, and private Jira connections are separate product settings. YAML alone does not enable those features. Keep private integration destinations and credentials outside this public repository.

## Fifteen executable lessons

| Lesson | OWASP mapping | Secure control |
| --- | --- | --- |
| Cross-account invoice access | Web 2025 A01 | Shared account ownership predicate |
| Debug response exposure | A02 | Minimal health response |
| Untrusted connector artifact | A03 | Approved source and signature; no arbitrary JavaScript execution |
| Encoded bank details | A04 | AES-GCM authenticated encryption |
| SQL search injection | A05 | Bound query parameters |
| Duplicate refunds | A06 | Idempotency and cumulative refund limit |
| Predictable reset token | A07 | Random, expiring, single-use token |
| Forged payment webhook | A08 | HMAC, timestamp, replay and account checks |
| Missing security alerts | A09 | Safe audit metadata and a repeated-denial alert |
| Permission timeout grants export | A10 | Deny on policy failure |
| Ticket prompt injection | LLM01 | Server tool and destination allowlist |
| Private model context | LLM02 | Minimal field projection and safe logs |
| AI reply executes HTML | LLM05 | HTML allowlist and scripts disabled |
| Excessive refund agency | LLM06 | Server-enforced cumulative $50 authority cap |
| Cross-account document retrieval | LLM08 | Tenant filter before retrieval results |

These are runnable teaching cases. The scan's observed findings do not establish that every lesson was detected or that unreported code is safe.

## Recording checklist

Use the laptop's main display, full screen, at its highest available resolution. Use large fonts, no audio, permanent small captions, visible clicks, deliberate pointer movement, and visibly typed text. Show the selected link or button before each page appears. Label waiting-period cuts and keep idle pauses below two seconds. Label saved CLI output and local runtime evidence.

## References

- [OWASP Web Top 10 2025](https://top10.owasp.org/2025/)
- [OWASP GenAI / LLM Top 10](https://genai.owasp.org/llm-top-10/)
- [ASD-STE100 writing reference](https://www.asd-ste100.org/)

The explanations use short sentences and familiar words. They do not claim certified ASD-STE100 compliance.
