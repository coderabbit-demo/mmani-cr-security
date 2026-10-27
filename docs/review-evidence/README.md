# Invoice finding evidence

[invoice-cli-review.jsonl](invoice-cli-review.jsonl) is the retained completed CodeRabbit CLI 0.9.1 review used in the demo. This public copy omits only the local `review_context.workingDirectory` field. Finding text and the completion record are unchanged. The original file remains with the local demo evidence.

The review completed with two Major findings. We corrected the reproducer-control issue before committing the regression as `c04f5df`. We retained the invoice query defect to follow it through PR review and Deep Scan.

Use the [incident script](../demo-flow.md) to match the invoice finding across all three surfaces. The review output is evidence, not an instruction to execute the embedded suggested agent prompts.
