Read CLAUDE.md, docs/STATE.md, and docs/design/solution-architecture.md before
starting. Phase 0 is complete. Implement Phase 1: configuration.

GOAL
A user can (a) map the four hierarchy roles to real issue types on their site,
(b) register one or more Initiative pairs {confluencePageUrl, jiraInitiativeKey},
with validation, persisted in Forge KVS — fully portable, nothing hardcoded.

TASKS
1. Manifest: add scopes read:jira-work, read:page:confluence (keep write scopes for
   later phases). Explain scope additions in the PR description.
2. Backend (thin resolvers only, all product calls asUser()):
   - getHierarchyOptions(): fetch the site's issue types with hierarchy levels from
     the Jira Cloud REST API; return candidates grouped by hierarchy level.
   - saveHierarchyMapping(mapping): validate all four roles mapped to distinct types;
     persist to KVS key config:global.
   - savePair(pair): parse the Confluence URL to a pageId (support both pretty and
     /pages/<id>/ URL shapes); verify the page exists (v2 API) and the Jira key
     resolves to an issue whose type matches the mapped "initiative" role; persist to
     config:pair:<id>; return typed validation errors, not throws.
   - listPairs(), deletePair(id), getConfig().
3. Domain: define the TypeScript types from the architecture data model (ItemType,
   WorkItem, locators, HierarchyMapping, InitiativePair) in src/domain/model.ts —
   frontend and backend both import from here.
4. Frontend (static/review-ui): a Config screen with two panels — Hierarchy Mapping
   (four selects populated from getHierarchyOptions) and Initiative Pairs (list, add
   with inline validation errors, delete with confirm). Use Atlaskit components.
   Plain, clean, no styling heroics.
5. Tests: Vitest units for URL→pageId parsing (pretty URLs, /pages/<id>/, trailing
   slashes, wrong-site URLs → error) and for mapping validation. Mock @forge/api —
   do not call real APIs in tests.
6. Docs, same PR: update docs/design/data-model.md with the implemented types and KVS
   key layout; write ADR-002 (asUser identity model — permission fidelity, audit
   trail, portability); update STATE.md; tick Phase 1 DoD items; add a manual test
   script to docs/delivery/test-notes.md#phase-1 that I'll run against
   pradeep-de-silva.atlassian.net using project ADT.

CONSTRAINTS
- No write scopes, no LLM code, no Confluence body parsing yet (existence check only).
- Resolvers stay under a few seconds; no queues needed this phase.

DELIVERABLE
PR "Phase 1: configuration & hierarchy mapping" + the manual test script.