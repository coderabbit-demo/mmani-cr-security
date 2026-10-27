# Harbor Support security demo

A local customer support and billing website for demonstrating CodeRabbit Security. Fifteen lessons compare insecure and secure implementations against OWASP Web 2025 and selected OWASP LLM 2025 risks.

The main story starts with a Cedar user asking for Maple's invoice. The CLI flags a missing ownership check. PR review and the full repository scan find the same defect. Executed requests prove the exposure, then one shared repair protects the invoice API, assistant, and export. [Follow the incident and its evidence](docs/demo-flow.md).

## Local use

Use Node 24.12 or later in the Node 24 line.

```sh
npm ci
npm run build
npm start
```

Open http://127.0.0.1:4173. The workspace starts with the Cedar demo account. Use the account selector to switch to Maple. Use Reset demo data before each rehearsal. For development use `npm run dev`; the frontend reloads through Vite. Restart the process after backend changes.

Or run the isolated container:

```sh
docker compose up --build
```

Compose publishes only `127.0.0.1:4173`. The application stores records in memory and resets them on restart. No external model key, database service, or payment provider is required. SQLite is bundled with Node; some Node 24 releases display an experimental-module warning.

All records and effects are synthetic. The lesson endpoints intentionally contain vulnerabilities. The connector lesson supports only two fixed field requests; it does not execute supplied JavaScript. AI messages and refunds use a local adapter and outbox. The HTML lesson runs inside an isolated training frame. Use a private local machine or the supplied Compose setup.

## Validation

Run `npm test` for API and security-control integration tests. Run `npm run build` for the production UI. CI runs both checks on every pull request.

## Demo revisions

The baseline shared invoice service checks account ownership. The focused demonstration PR removes that check, then restores it after review and verification. Use the vulnerable replay tag when demonstrating the insecure invoice request. Use the remediation revision to demonstrate a verified fix. Other paired lessons remain available throughout.

See [the implementation plan](docs/implementation.md). Configure private integration destinations in the review service, outside this public repository.

See the [incident script](docs/demo-flow.md) for the five-act story, matching CLI/PR/scan evidence, verified ending, and presenter appendices. Replay tags: `demo-baseline`, `demo-vulnerable`, and `demo-remediated`.
