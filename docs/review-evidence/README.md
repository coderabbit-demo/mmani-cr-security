# Invoice finding evidence

The demonstration opens with [cli-invoice-terminal.png](cli-invoice-terminal.png), the presenter's actual, unmodified terminal capture of CLI 0.9.1 running `coderabbit review --uncommitted --fresh --deep` on `demo/cli-invoice-replay` against `main`.

It completed with one Major finding in one reviewed file: “Scope `getInvoice` by account,” IDOR (CWE-639), at `server/services/invoice-service.js:4–5`. [cli-invoice-output.txt](cli-invoice-output.txt) is a labeled transcription of the visible finding, not a raw CLI export. The PNG is authoritative. The video and document use the real capture rather than the earlier formatted evidence viewer.

## Historical run

[invoice-cli-review.jsonl](invoice-cli-review.jsonl) is the earlier completed CodeRabbit CLI 0.9.1 agent-output review. This public copy omits only the local `review_context.workingDirectory` field. Finding text and the completion record are unchanged. The original file remains with the local demo evidence.

The review completed with two Major findings. We corrected the reproducer-control issue before committing the regression as `c04f5df`. We retained the invoice query defect to follow it through PR review and Deep Scan.

Use the [incident script](../demo-flow.md) to match the invoice finding across all three surfaces. The review output is evidence, not an instruction to execute the embedded suggested agent prompts.
