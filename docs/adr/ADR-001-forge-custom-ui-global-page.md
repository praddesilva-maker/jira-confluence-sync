# ADR-001: Custom UI on `jira:globalPage`

**Status:** Accepted
**Date:** 2026-07-04

## Context

The app needs a single, rich surface for config, drift comparison, and the human-in-the-loop
review board (side-by-side diffs, direction pickers, LLM suggestion accept/edit/reject —
solution-architecture.md §7). Two real alternatives existed:

1. **A Confluence macro/content-action** as the primary entry point — natural fit given the app
   also writes to Confluence, but requires an existing, correctly-scaffolded Confluence page
   before the app is usable at all, and macro UI real estate is more constrained.
2. **A Jira `jira:globalPage` Custom UI app** — a dedicated full-page React surface reachable from
   Jira's global nav, independent of any Confluence page existing yet.
3. UI Kit (native Jira components rendered without an iframe) was considered and rejected: the
   review board's interaction density (tree-grouped cards, inline diff, per-field accept/edit/
   reject) needs full React/Atlaskit control that UI Kit does not give.

## Decision

Build the primary and only Phase 0–6 surface as **Custom UI (React) on `jira:globalPage`**. A
`confluence:contentAction` ("Compare with Jira") may be added later as a convenience entry point
into the same UI, but is not required for the app to be useful.

## Consequences

- The app works on day one of installation, before the user has created any Confluence page
  structure — no chicken-and-egg bootstrap problem.
- Full control over the review board's interaction design (Atlaskit components, custom layout),
  at the cost of owning more UI code than a macro would require.
- Custom UI ships as a separate static bundle (`static/review-ui`) built with Vite and loaded via
  `@forge/bridge`; this is the origin of the two-`package.json` repo layout (root = backend
  resolvers/domain, `static/review-ui` = frontend).
