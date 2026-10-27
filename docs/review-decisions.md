# Review decisions

The first implementation review found incidental weaknesses outside the intended lesson boundaries. The implementation now scopes outbox history to its account, limits cumulative assistant refunds, uses asynchronous password derivation and bounded sign-in attempts, removes expired sessions, returns JSON API errors, preserves keyboard focus, and discards stale UI results.

The connector lesson now interprets only two fixed field requests. It does not execute submitted JavaScript. This preserves the unsigned-artifact comparison while removing the ability to escape a JavaScript VM into the host process.

The container image defaults to loopback. Compose explicitly enables the container listener and publishes only a loopback host port. A later CLI suggestion to restore an all-interface image default was declined because it would undo that isolation decision. The documented Compose deployment is the supported container entry point.

Intentional insecure handlers remain part of the teaching scope. Secure handlers and the surrounding workspace are subject to normal remediation. Actual finding severity and coverage must be reported from the reviewed revision.

The shared invoice regression was repaired in `1844ccf` and merged through PR #2 after CodeRabbit Security verified its Major finding as fixed. All 21 tests, the production build, and the three-consumer local runtime checks pass. The vulnerable `c04f5df` revision remains at `demo-vulnerable` for replay.

One separate Deep Scan finding, `3b4e3e45-25a5-4988-9b77-241dc4263586` at `server/labs/ai.js:6`, is accepted only for the deliberate prompt-injection lesson. Its supported effect is a synthetic local outbox entry; the handler sends no network request. This is a real unsafe tool-authority pattern retained for teaching. The dismissal uses Accepted risk and saves no learning or path instruction. Revisit if the app is deployed, uses real data, or gains external delivery or model tools. This exception does not apply to the repaired invoice service or other findings.
