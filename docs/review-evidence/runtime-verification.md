# Hosted Runtime Verification evidence

Observed on October 27, 2026 in CodeRabbit Security for coderabbit-demo/mmani-cr-security.

- Finding: Authorization bypass, Medium, `server/labs/ai.js:48`.
- Finding ID: `8219f012-0c9e-4b0a-b774-2fae94a3c190`.
- Requested and tested revision: `main [f121d41]`.
- Environment: Web-Dev-MMANI, Node 24.
- Guide: regenerated and published; direct retrieval fixture with a Cedar actor.
- Runtime assessment: **Inconclusive**.
- Application ready: Confirmed.
- Target exercised: Not established.
- Steps completed: 2 of 2.
- QA Agent minutes: 0.89.
- Finding state: Open.

The retained output lists Maple document DOC-M2, its title and Lighthouse body, followed by `secure documents: []`. The retained command replaces the fixture body with `[REDACTED]`. The assessor explicitly states that this evidence does not establish the Cedar actor, real handler invocation, or secure control. Matching output is not a verified reproduction.

[Open the actual finding and runtime assessment](https://app.coderabbit.ai/security/code?owner=coderabbit-demo&repo=mmani-cr-security&findingId=8219f012-0c9e-4b0a-b774-2fae94a3c190&findingTab=runtime-validation). Access requires the appropriate CodeRabbit workspace.

The local deliverables retain the main-display launch and result recordings, the UI text, screenshots, and a captioned forty-second clip. The invoice incident's local proof remains a separate result.

The next engineering investigation concerns evidence capture and redaction: preserve sufficient non-secret fixture structure or an auditable execution artifact so the assessor can establish caller identity and target execution. Real secrets should remain protected. The earlier QA usage billing gate is resolved.
