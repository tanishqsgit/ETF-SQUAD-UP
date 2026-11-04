# Choose the right SquadUp setup path

## Explore the interface

Start with the [README](../README.md). The default client supports a labelled
browser-only demo. A demo does not establish that authentication, chat, storage,
or external providers are connected.

## Develop the full stack

Use the README's full-stack instructions and [full release notes](FULL-RELEASE.md).
Configure a fresh local database and ignored environment file. The existing
machine-specific database notes are not prerequisites that every contributor has.
Keep live verification accounts and generated credentials out of commits.

## Assess readiness

Read [verification](../VERIFICATION.md) and the README's remaining launch work.
Distinguish implemented behavior, locally tested behavior, and unverified external
integrations. No production deployment, latency guarantee, or security certification
is implied by source publication.

## Review an AI-assisted feature

Use synthetic data and the project's existing non-provider mode first. Before
enabling an external provider, confirm the organisation approves the tool and the
data sent to it. Check generated bios and summaries for invented player facts;
check moderation for both false positives and missed harmful content. Record test
cases and actual results rather than treating a plausible answer as correct.

This guide adds no provider calls or credentials. It is AI-assisted documentation,
not an externally verified AI pilot or a change to the application's runtime behavior.
