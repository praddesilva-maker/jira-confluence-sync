# ADR-002: `asUser()` identity for all product API calls

**Status:** Accepted
**Date:** 2026-07-04

## Context

Every Jira/Confluence read and write needs to run as some identity. Forge offers two:

1. **`asApp()`** — calls run with the app's own installed permissions, independent of which human
   triggered the action.
2. **`asUser()`** — calls run with the permissions of whoever is currently using the app, subject
   to that user's own product permissions.

This app syncs content and creates issues on a user's behalf, across two products, for clients
whose permission schemes we don't control (solution-architecture.md §9, portability).

## Decision

Use **`asUser()`** as the default identity for all Jira and Confluence reads and writes exposed
through the review/sync flow. `asApp()` is reserved for internal housekeeping only (if and when
the app needs to do something no human triggered — none exists as of Phase 0).

## Consequences

- **Permission fidelity:** a user can never sync content into a project/space they couldn't
  otherwise edit — the app inherits the client's existing permission scheme instead of needing to
  reconcile it with an app-level identity.
- **Clean audit trail:** Jira/Confluence history shows the actual acting user, not a generic app
  identity, which matters for the audit entries this app writes per mutation (solution-
  architecture.md §7, §11).
- **Portability:** `asUser()` behaves consistently across client sites with different permission
  schemes, which is the whole point of §9 — no client-specific permission workarounds needed.
- Cost: resolvers must handle `asUser()` calls failing due to the *user's* permissions (not just
  the app's), and surface that as a typed error rather than a silent failure — this is a
  requirement on every product-API-calling resolver from Phase 1 onward, not just a nice-to-have.
