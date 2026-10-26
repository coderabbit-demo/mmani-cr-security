# Harbor Support security demo

A local customer support and billing website for demonstrating CodeRabbit Security. Fifteen lessons compare insecure and secure implementations against OWASP Web 2025 and selected OWASP LLM 2025 risks.

The main story follows cross-account invoice access through CLI review, pull request review, Jira ticket creation, Deep Scan, runtime verification, and remediation.

## Local use

Implementation is in progress. The completed app will run with Node 24 using `npm ci`, `npm run build`, and `npm start`, or with Docker Compose. All records and effects are synthetic. Run it on a private local machine; the lesson endpoints intentionally contain vulnerabilities.

See [the implementation plan](docs/implementation.md). Configure private integration destinations in the review service, outside this public repository.
