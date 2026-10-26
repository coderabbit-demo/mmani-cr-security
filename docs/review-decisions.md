# Review decisions

The first implementation review found incidental weaknesses outside the intended lesson boundaries. The implementation now scopes outbox history to its account, limits cumulative assistant refunds, uses asynchronous password derivation and bounded sign-in attempts, removes expired sessions, returns JSON API errors, preserves keyboard focus, and discards stale UI results.

The connector lesson now interprets only two fixed field requests. It does not execute submitted JavaScript. This preserves the unsigned-artifact comparison while removing the ability to escape a JavaScript VM into the host process.

The container image defaults to loopback. Compose explicitly enables the container listener and publishes only a loopback host port. A later CLI suggestion to restore an all-interface image default was declined because it would undo that isolation decision. The documented Compose deployment is the supported container entry point.

Intentional insecure handlers remain part of the teaching scope. Secure handlers and the surrounding workspace are subject to normal remediation. Actual finding severity and coverage must be reported from the reviewed revision.
