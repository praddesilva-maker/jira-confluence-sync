# ADR-004: Configurable hierarchy root per pair

**Status:** Accepted — supersedes the Q1 row in `docs/design/solution-architecture.md` §13
(marked "Reversed by CR-001, ADR-004" there, not deleted)
**Date:** 2026-07-04

## Context

Q1 (`docs/design/solution-architecture.md` §13) originally assumed Jira Premium and a hard,
four-level hierarchy (Initiative → Feature → Epic → Story/Task) as a v1 prerequisite. Two problems
surfaced:

1. **Portability across client tiers.** Not every client site is on Premium. A hard Premium
   requirement rules out Standard/Free-tier sites entirely — exactly the single-tenant trap
   `docs/design/solution-architecture.md` §9 warns against for every other hardcoded assumption.
2. **Personal/demo testability.** The owner's own test site
   (`pradeep-de-silva.atlassian.net`) may not have Premium's extra hierarchy levels, which blocks
   end-to-end testing on a free/personal-tier site — the exact test bed this project relies on
   per `docs/design/solution-architecture.md` §14.

Epic is the one hierarchy level guaranteed to exist on every Jira tier. The real alternatives were:
(a) keep the hard Premium prerequisite (status quo, rejected — see above), or (b) let the user
nominate where the hierarchy starts, per initiative pair, with Epic as the floor.

## Decision

**The hierarchy root is configurable per pair.** Each pair carries a `rootLevel` of
`initiative | feature | epic`, chosen by the user at pair-registration time. `epic` is the minimum
— it requires no Premium hierarchy levels at all. `feature` and `initiative` roots still require
the corresponding Premium custom hierarchy levels to exist on the site.

This reverses Q1 without renumbering it: `docs/design/solution-architecture.md` §13's Q1 row is
updated in place with a "Reversed by CR-001, ADR-004" note, per this project's ADR append-only
convention — the row records what changed and why, rather than being deleted.

## Consequences

- **Page-model variants** (`docs/design/solution-architecture.md` §5.2): the Confluence page tree
  under an `initiative`-root pair is unchanged (root page + one child page per Feature). A
  `feature`-root or `epic`-root pair collapses to a **single page** — no child-page tier exists
  below a Feature or Epic root, so Epics/Stories/Tasks tables (as applicable) live directly on that
  one page.
- **Hierarchy mapping becomes conditional** (§9 point 1): the mapping screen only asks for roles at
  or below the chosen root. An `epic`-root pair maps three roles (epic, story, task); a
  `feature`-root pair adds feature; only an `initiative`-root pair needs all four — and only that
  case requires Premium.
- **New drift status `OUT_OF_SCOPE`** (§4): a Parent Key can now reference an item structurally
  outside the configured pair's subtree (e.g., a Story whose parent Epic belongs to a different,
  unconfigured Feature). This is distinct from `MISSING_IN_JIRA` (key doesn't resolve at all) —
  here the key resolves, just outside scope. Flagged for manual handling, never auto-synced, same
  deletion-safety posture as the app's other never-auto-fix statuses.
- **Q5 move/relocate logic is scoped down**: `createFeaturePage` and `relocateRows` only make sense
  when `rootLevel: initiative` — there's no Feature-page tier to create or relocate across for
  `feature`- or `epic`-root pairs. A `MOVED` item there is an in-page table edit, not a cross-page
  operation.
- **Pair validation** now checks the configured `jiraRootKey`'s issue type against the mapped
  issue type for that pair's `rootLevel`, not always against "Initiative".
- **Not addressed by this ADR** (flagged, not silently fixed — see the CR-001 PR description):
  `docs/design/solution-architecture.md` §5.1 (Jira adapter) and §1 (Purpose) still describe the
  hierarchy as always starting at Initiative; §7 (HIL review board) still shows the drift-card tree
  as always four levels deep. These read as stale after this ADR but are out of CR-001's explicit
  scope (docs-only, Confluence adapter + config/domain sections + drift statuses) — worth a
  follow-up pass, likely alongside the Phase 1/2 implementation work this ADR extends.
