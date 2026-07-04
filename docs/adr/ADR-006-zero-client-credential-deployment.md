# ADR-006: Zero-client-credential deployment model

**Status:** Accepted
**Date:** 2026-07-05

## Context

CR-002 formalizes how this app gets deployed and installed across multiple client Atlassian sites.
This is exactly the kind of feature that quietly grows a "just store the client's API token so we
can automate their install" shortcut — which would be a serious security posture regression for a
multi-client Forge app, and cuts against the portability stance already established in
`docs/design/solution-architecture.md` §9. The real question CR-002 forces: what credentials, if
any, does deploying/installing to a client site require, and where do they live?

## Decision

**No client API tokens exist anywhere in this design, ever.** Exactly one credential is used for
the entire deploy/install tooling: the **operator's own** Atlassian API token
(`FORGE_EMAIL`/`FORGE_API_TOKEN`, per `.env.example`), which authenticates the Forge CLI itself —
nothing client-specific. Client site URLs are a pure tooling/config concern
(`deploy.config.json`, gitignored) with no bearing on the app's runtime.

Getting the app running on a client site works one of two ways, both credential-free from the
client's side:

1. **Operator has site admin on the client site:** `scripts/deploy.mjs` runs `forge install
   --confirm-scopes`, which prompts the client's site (via the operator's own admin session on
   that site) to approve the manifest's declared scopes — no separate credential exchange.
2. **Operator lacks admin on the client site:** the script deploys but the install step fails with
   a permission error (surfaced as a clear message, not a raw CLI error — see `scripts/deploy.mjs`'s
   `installOneTarget`); the operator instead shares a **Forge installation link**, and the client's
   own admin completes the install and scope approval themselves, on their own authority.

After install, the app's runtime access to that client's Jira/Confluence comes exclusively from the
OAuth scopes declared in `manifest.yml` and approved once at install time — every subsequent
product call runs `asUser()` (ADR-002), inheriting whichever human is using the app's own
permissions on that site.

## Consequences

- **Nothing to store or rotate per client.** No client credential ever enters Forge KVS, `.env`,
  CI secrets, or any other storage this project controls — there's no per-client secret lifecycle
  to manage, audit, or leak.
- **The README's "Client onboarding" section is the client-facing security answer** to "how does
  this app get access to our site" — point security reviewers there directly.
- **Symmetry with the multi-tenant portability stance** (`docs/design/solution-architecture.md`
  §9): this app already refuses to hardcode anything client-specific into scopes/config; this ADR
  extends that same posture to the deploy/install tooling itself.
- **Cost:** path (2) (no operator admin) is manual — the operator can't script around a client
  admin's own approval step, by design. That friction is the point, not a gap to close.
- Any future feature that would require storing a client's credential (an API token, a client
  secret, anything scoped to one client site) needs a new ADR explicitly superseding this one —
  it does not get to arrive as a quiet implementation detail.
