Read CLAUDE.md, docs/STATE.md, and docs/design/solution-architecture.md before
starting. Phase 0 is complete. Implement Phase 1: configuration.

GOAL
A user can (a) choose a hierarchy root level per pair (initiative | feature | epic —
CR-001, ADR-004) and map only the roles at/below that root to real issue types on
their site, (b) register one or more pairs
{confluencePageUrl, jiraRootKey, rootLevel}, with validation, persisted in Forge
KVS — fully portable, nothing hardcoded, and usable on non-Premium tiers via an
epic-root pair.

TASKS
1. Manifest: add scopes read:jira-work, read:page:confluence (keep write scopes for
   later phases). Explain scope additions in the PR description.
2. Backend (thin resolvers only, all product calls asUser()):
   - getHierarchyOptions(): fetch the site's issue types with hierarchy levels from
     the Jira Cloud REST API; return candidates grouped by hierarchy level.
   - saveHierarchyMapping(mapping, rootLevel): validate only the roles at/below the
     given rootLevel are mapped, each to a distinct type; persist to KVS key
     config:global. (An epic-root mapping needs epic/story/task; feature-root adds
     feature; only initiative-root needs all four.)
   - savePair(pair): pair now includes rootLevel (initiative | feature | epic). Parse
     the Confluence URL to a pageId (support both pretty and /pages/<id>/ URL
     shapes); verify the page exists (v2 API) and jiraRootKey resolves to an issue
     whose type matches the mapped issue type for that pair's rootLevel (not always
     "initiative"); persist to config:pair:<id>; return typed validation errors, not
     throws.
   - listPairs(), deletePair(id), getConfig().
3. Domain: define the TypeScript types from the architecture data model (ItemType,
   WorkItem, locators, HierarchyMapping, PairConfig — renamed from the earlier
   working name InitiativePair since a pair's root isn't always an Initiative;
   PairConfig carries rootLevel: 'initiative' | 'feature' | 'epic') in
   src/domain/model.ts — frontend and backend both import from here.
4. Frontend (static/review-ui): a Config screen with two panels — Hierarchy Mapping
   (a root-level selector plus selects only for the roles at/below it, populated
   from getHierarchyOptions) and Pairs (list, add — including the per-pair
   root-level choice — with inline validation errors, delete with confirm). Use
   Atlaskit components. Plain, clean, no styling heroics.
5. Tests: Vitest units for URL→pageId parsing (pretty URLs, /pages/<id>/, trailing
   slashes, wrong-site URLs → error) and for mapping validation, with cases for all
   three root levels (initiative, feature, epic) — including that an epic-root
   mapping rejects a feature/initiative role and vice versa. Mock @forge/api — do
   not call real APIs in tests.
6. Docs, same PR: update docs/design/data-model.md with the implemented types and KVS
   key layout; confirm ADR-002 (asUser identity model, written in Phase 0) still
   reflects the implementation, amending only if Phase 1 revealed a deviation;
   update STATE.md; tick Phase 1 DoD items; add a manual test script to
   docs/delivery/test-notes.md#phase-1 that I'll run against
   pradeep-de-silva.atlassian.net using project ADT, PLUS a second script entry
   validating an epic-root pair end-to-end on a free-tier site (no Premium
   hierarchy levels required for that pair).

CONSTRAINTS
- No write scopes, no LLM code, no Confluence body parsing yet (existence check only).
- Resolvers stay under a few seconds; no queues needed this phase.

DELIVERABLE
PR "Phase 1: configuration & hierarchy mapping" + the manual test script.