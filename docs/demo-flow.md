# Cedar asked. Maple's invoice answered.

A support agent is signed into **Cedar Studio**. The agent requests invoice **INV-2002** through the invoice page, assistant, or export. That invoice belongs to **Maple Works**. The application knows who signed in. Does it check who owns the invoice?

A developer has changed the shared lookup, `getInvoice`. The query now checks only the invoice ID. This is the one defect we follow from the developer's CLI to the team's PR review and then the full repository scan. The ending is a tested repair in the shared service, protecting all three callers.

This is a replay of a completed demonstration using real retained review results. We deliberately carried the invoice defect into a demo PR and scan to compare the three review surfaces. In ordinary development, fix a confirmed CLI finding before pushing. All data is synthetic and the application runs on loopback.

## The thread to keep on screen

| Observation | What identifies the same defect | Actual result | Evidence |
| --- | --- | --- | --- |
| CLI, presenter replay before commit | `server/services/invoice-service.js:4–5`; `getInvoice` accepts an invoice ID without an account filter; API, assistant, and export can return another account's invoice | Major; IDOR; CWE-639; one finding, one file reviewed | [Actual terminal capture](review-evidence/cli-invoice-terminal.png); finding: “Scope `getInvoice` by account.” [Transcribed excerpt](review-evidence/cli-invoice-output.txt) |
| PR #2, vulnerable `c04f5df` | Same file, lines, missing filter, wrong-account request, and three callers | Major; IDOR; CWE-639 | [Exact PR finding](https://github.com/coderabbit-demo/mmani-cr-security/pull/2#discussion_r4383413143) |
| Full repository scan `70d07745` | Same source at `c04f5df`; same missing ownership check; same three callers, plus the insecure lesson | Medium; IDOR; CWE-639 | [Exact Deep Scan finding](https://app.coderabbit.ai/security/repositories?owner=coderabbit-demo&repo=coderabbit-demo%2Fmmani-cr-security&tab=code&scanId=70d07745-88af-4e9e-be83-15ac3c916af8&orgId=3f6ae291-41c4-48f8-bb79-8add1989d23a&findingId=2afb5613-26bc-42d1-a2d1-8791b506b214) |

These are three observations of one code defect. They have different review records and severity labels. Do not imply a common finding ID. The presenter's actual CLI capture explicitly reports CWE-639, matching the PR and repository scan.

## Act 1 — The developer spots the missing rule

**Open with the CLI, not a menu of security features.** Show the presenter's actual terminal capture, including the command, source path, security classification, suggested repair, and completed result:

```sh
coderabbit review --uncommitted --fresh --deep
```

Say: “Cedar is signed in. The code still has to check that the requested invoice belongs to Cedar. The CLI catches the missing account check before this change is committed.”

Point to the Major finding at `invoice-service.js:4–5`. Read the concrete consequence: a Cedar user can request `INV-2002` and receive Maple's invoice. Then point out the three callers. The assistant is affected because it calls this same service; it does not need a separate model exploit.

The presenter's CLI 0.9.1 replay compares `demo/cli-invoice-replay` with `main` and reviews the uncommitted invoice lookup change. It completed with **one Major finding in one file**. Its title is “Scope `getInvoice` by account.” The result explicitly names IDOR (CWE-639), External reachability, and Moderate exploitability. The original terminal PNG is preserved unchanged. The recording presents that capture, with no simulated terminal or reformatted finding viewer.

An earlier agent-output review is retained separately in the [historical JSONL](review-evidence/invoice-cli-review.jsonl). It had two findings, including the reproducer-control issue that was corrected before `c04f5df`. It is not the CLI result shown in the revised demonstration.

**Transition:** “Does the same flaw remain visible when this change reaches the team?”

## Act 2 — The PR turns a local warning into a release decision

Open the [matching PR comment](https://github.com/coderabbit-demo/mmani-cr-security/pull/2#discussion_r4383413143). Keep the path and lines visible. The review now calls the defect **IDOR, CWE-639**, rated **Major**. It asks for the account ID from the authenticated session to be included in the query.

Say: “This is the same lookup the CLI flagged. Signing in proves who Cedar is. It does not give Cedar access to Maple's invoice.”

The reviewer now needs to choose the scope of the repair. Click **View Security blast radius** from this finding. Follow the shared service to the invoice API, assistant tool, and export. Expand [Security architecture risk](https://github.com/coderabbit-demo/mmani-cr-security/pull/2#issuecomment-6429275068) to explain the broken boundary: authentication and SQL parameters remain, but record ownership is no longer checked.

Say: “A patch in the invoice page alone would leave the assistant and export exposed. Put the rule in the shared service.”

Open the [required security check on the vulnerable head](https://github.com/coderabbit-demo/mmani-cr-security/runs/121898743536): one Major found, zero fixed, one remaining, one blocking. Main requires this check from the CodeRabbit app, including administrators. The team has a concrete reason to stop the merge.

**Transition:** “The PR explains this change. Can a full repository scan independently find the same unsafe path?”

## Act 3 — The repository scan finds the same defect in context

Open [scan 70d07745](https://app.coderabbit.ai/deep-scans/70d07745-88af-4e9e-be83-15ac3c916af8), which scanned the committed vulnerable code. Select the invoice IDOR. If replaying after repair, show all states so the original finding remains visible.

Match three things explicitly: **`invoice-service.js:4–5`**, **the missing account filter**, and **the API, assistant, and export paths**. The source link in the finding points to `c04f5df`. The scan calls it **Medium, CWE-639**. Its recommendation is to add the account predicate inside `getInvoice`.

Say: “We started with one uncommitted query change. The CLI, PR review, and full repository scan all reached the same missing ownership check. Their labels differ; the source and business impact match.”

The original scan reported ten findings: three Medium and seven Low. We stay with the invoice defect. Other deliberate lessons are available for a later discussion; they do not interrupt this investigation.

**Transition:** “We know the source and the paths. Can Cedar actually receive Maple's data?”

## Act 4 — Prove the impact, then restore one shared rule

Use local execution against `demo-vulnerable`. Hosted Runtime Analysis was unavailable because the account had no Agent minutes and usage billing was off. Local reproduction was explicitly approved. Show the distinction on screen.

```sh
node scripts/reproduce-invoice.js --expect-vulnerable
```

First show Maple retrieving its own `INV-2002` through all three routes. This positive control proves the endpoints and fixture work. Next show Cedar receiving the same invoice with HTTP 200 through all three routes. Open the invoice lesson to make the business consequence visible: wrong account, real returned fields, synthetic data.

Say: “The data crossed the account boundary. The defect is shared, so the repair must be shared too.”

Open [repair commit 1844ccf](https://github.com/coderabbit-demo/mmani-cr-security/commit/1844ccf6826c3a8e8b77b95266fab65e1061bc00). Restore the rule in `getInvoice`:

```js
WHERE id = ? AND account_id = ?
.get(invoiceId, actor.accountId)
```

Restart the repaired server. Run tests, the production build, and the same reproducer without vulnerable mode:

```sh
npm test
npm run build
node scripts/reproduce-invoice.js
```

| Same request, same fixtures | Vulnerable query | Repaired shared query |
| --- | --- | --- |
| Maple requests its own invoice | Allowed through all three routes | Still allowed through all three routes |
| Cedar uses the invoice API for Maple's invoice | 200; Maple data exposed | 404; denied |
| Cedar asks the assistant for Maple's invoice | 200; Maple data exposed | 404; denied |
| Cedar exports Maple's invoice | 200; Maple data exposed | 404; denied |

All 21 tests and the production build pass. Additional executed assertions confirm error-only denial bodies with no Maple invoice fields. The reproducer rejects missing routes instead of mistaking their 404s for a repair.

**Transition:** “The local checks pass. Does the review system recognize that this exact defect is fixed?”

## Act 5 — Close the invoice finding with evidence

Open the [check for repaired head 1844ccf](https://github.com/coderabbit-demo/mmani-cr-security/runs/121950267554): one Major found, one verified fixed, zero remaining, zero blocking. Resolving a conversation alone would not establish this result. [PR #2](https://github.com/coderabbit-demo/mmani-cr-security/pull/2) merged after the required check passed.

Show the invoice finding marked **Fixed** in PR Security Reviews. Open the repaired [repository scan 90e0cd48](https://app.coderabbit.ai/deep-scans/90e0cd48-3430-4da1-a84f-ce31292fd0e8). It completed without the invoice IDOR; the original invoice finding is Fixed. In Attack Surface, the current data flow describes an account-scoped shared invoice query protecting these callers. A coverage label of “verified” is not a declaration that the application is safe. Other lab and hardening findings remain.

Say: “Cedar can still do Cedar's work. Maple's invoice stays with Maple. One policy in the shared service protects the page, assistant, and export.”

### Leave enough context for the next person

After the repair, the PR agent was asked to create a Bug recording this incident and its acceptance evidence. The agent created and verified [CRDEMO-12](https://coderabbit-demo.atlassian.net/browse/CRDEMO-12), and returned its link in [PR #3](https://github.com/coderabbit-demo/mmani-cr-security/pull/3#issuecomment-6431943119). The issue is Open and explicitly records the merged repair. Do not present it as a ticket opened before the fix or as automatically closed.

The useful outcome is its context: vulnerable and repaired revisions, source finding, three exposed callers, impact, reproduction, shared fix, and positive and negative acceptance tests. CodeRabbit later assessed the linked issue by source; it did not execute our local tests.

### Optional epilogue — A different finding needs a different decision

The invoice defect was repaired, not dismissed. To explain triage, move explicitly to a **separate** Low prompt-injection finding, `3b4e3e45-25a5-4988-9b77-241dc4263586` at `server/labs/ai.js:6`. Its effect is a synthetic entry in the local outbox, with no network delivery. It was dismissed as Accepted risk for this isolated lesson, with no saved learning or path instruction. Revisit if deployment, real data, or external tools change. Its rationale is in [review decisions](review-decisions.md).

End on the repaired invoice result. The audience should remember the account boundary and its shared repair, rather than a list of product screens.

## Presenter appendix — Prepare

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

## Presenter appendix — Set up and repeat the CLI review

Use the installed CodeRabbit CLI 0.9.1. Select the organization that owns the demo repository:

```sh
coderabbit --version
coderabbit auth org
```

Choose **coderabbit-demo**. Use `coderabbit auth status` to confirm the active organization. If the CLI is not signed in, complete `coderabbit auth login` first.

Start with a clean checkout. Create a local replay branch from the repaired `main` branch, then restore only the vulnerable invoice lookup as an **uncommitted change**:

```sh
cd "/Users/mahesh/Documents/ChatGPT/CodeRabbit Security - SOP/mmani-cr-security"

git switch -c demo/cli-invoice-replay main

git restore --source=demo-vulnerable --worktree -- server/services/invoice-service.js

git diff -- server/services/invoice-service.js
```

If `demo/cli-invoice-replay` already exists, use `git switch demo/cli-invoice-replay` instead of the creation command. Restore the file from `demo-vulnerable` each time you need to repeat the vulnerable review. The older `demo/invoice-scope-regression` branch already contains the repair and is not a fresh before-review setup.

The diff must remove `AND account_id = ?` and the `actor.accountId` argument from `getInvoice`, while the separate `getSecureInvoice` comparison remains scoped. Leave this change uncommitted, then run the human-readable command used in the actual terminal capture:

```sh
coderabbit review --uncommitted --fresh --deep
```

For the structured agent output used in the earlier run, add `--agent`:

```sh
coderabbit review --uncommitted --fresh --deep --agent
```

The completed presenter run reported **one Major IDOR (CWE-639)** at `server/services/invoice-service.js:4–5`, titled “Scope `getInvoice` by account.” The affected paths are the invoice API, assistant invoice tool, and export. New review wording can vary. The website does not need to be running for this CLI review.

After the demonstration, restore the fixed file and return to `main`. These commands assume the replay change was left uncommitted:

```sh
git restore --source=main --worktree -- server/services/invoice-service.js
git switch main
```

## Presenter appendix — Review configuration

The checked-in [`.coderabbit.yaml`](../.coderabbit.yaml) was validated against the published schema on 26 October 2026. It enables assertive reviews, draft and incremental reviews, linked-issue assessment, and supported security tools. Path instructions ask for reachable paths, existing controls, counterevidence, supported CWEs, and focused validation. The invoice instructions require review of all shared consumers.

The YAML requests Jira chat issue creation for this public repository. The product Chat setting was also saved as Enabled, and the PR agent subsequently created and verified CRDEMO-12. Chat interaction is restricted to organization members. A structured issue template requests the finding, impact, PR revision, reproduction, remediation, and acceptance criteria.

Use an explicitly approved connection in a scope containing only the intended repository. Remove unrelated inherited connections. A project context filter narrows review context; it does not restrict credential write authority. Use credentials restricted to the required project and operations, and record access reviews and any demo exception privately before enabling writes. Keep connection permissions and approval records outside this public repository. No per-action approval mechanism is claimed by this runbook.

Native Security check thresholds, GitHub branch protection, Deep Scan targets, runtime settings, and private Jira connections are separate product settings. YAML alone does not enable those features. Keep private integration destinations and credentials outside this public repository.

## Presenter appendix — Fifteen executable lessons

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
