Read CLAUDE.md, docs/STATE.md, and docs/design/solution-architecture.md before
starting. Phase 0 is complete and verified on the live site. Implement Phase 1:
configuration.

GOAL
A user can (a) maintain a site hierarchy mapping of roles to real issue types,
(b) register one or more pairs {confluencePageUrl, jiraRootKey, rootLevel} with
rootLevel per pair (initiative | feature | epic — CR-001, ADR-004), with
validation, persisted in Forge KVS — fully portable, nothing hardcoded, and
usable on non-Premium tiers via an epic-root pair.

TASKS
1. Manifest: add scopes read:jira-work, read:page:confluence (keep write scopes
   for later phases). Explain scope additions in the PR description.
2. Backend (thin resolvers only, all product calls asUser()):
   - getHierarchyOptions(): fetch the site's issue types with their hierarchy
     levels from the Jira Cloud REST API; return candidates grouped by level.
     On free-tier sites, levels above epic will legitimately be absent — return
     what exists; that is valid data, not an error.
   - saveHierarchyMapping(mapping): the mapping is site-global and maps a
     CONTIGUOUS run of roles from some top level down to task (valid shapes:
     all four; feature/epic/story/task; epic/story/task). Validate contiguity
     and that each mapped role uses a distinct issue type; persist to
     config:global. The mapping does NOT take a rootLevel argument.
   - savePair(pair): pair includes rootLevel (initiative | feature | epic).
     Validation, in order, returning typed validation errors (not throws):
     (a) COVERAGE: the pair's rootLevel and every level below it are present
     in the saved mapping — reject with a "mapping does not cover this root
     level" error otherwise; (b) parse the Confluence URL to a pageId (support
     pretty and /pages/<id>/ URL shapes) and verify the page exists (v2 API);
     (c) verify jiraRootKey resolves to an issue whose type matches the mapped
     type for that pair's rootLevel (not always "initiative"). Persist to
     config:pair:<id>.
   - listPairs(), deletePair(id), getConfig().
3. Domain: define the TypeScript types from the architecture data model
   (ItemType, WorkItem, locators, HierarchyMapping, PairConfig — carries
   rootLevel: 'initiative' | 'feature' | 'epic') in src/domain/model.ts —
   frontend and backend both import from here. Mapping-contiguity and
   pair-coverage validation live in the domain layer as pure functions.
4. Frontend (static/review-ui): a Config screen with two panels — Hierarchy
   Mapping (selects per role, populated from getHierarchyOptions; roles whose
   level doesn't exist on the site shown as unavailable) and Pairs (list, add —
   including the per-pair root-level choice, offering only root levels the
   current mapping covers — with inline validation errors, delete with
   confirm). Use Atlaskit components. Plain, clean, no styling heroics.
5. Tests: Vitest units for URL→pageId parsing (pretty URLs, /pages/<id>/,
   trailing slashes, wrong-site URLs → error), mapping contiguity validation
   (all valid shapes accepted; gaps rejected; duplicate types rejected), and
   pair coverage validation for all three root levels — including that a
   feature-root pair is rejected under an epic-only mapping. Mock @forge/api —
   do not call real APIs in tests.
6. Docs, same PR: update docs/design/data-model.md with the implemented types,
   the mapping-contiguity + pair-coverage rules, and the KVS key layout;
   reflect the same rules in solution-architecture.md's config section
   (per the CLAUDE.md staleness standing order); confirm ADR-002 (asUser
   identity model) still reflects the implementation, amending only if Phase 1
   revealed a deviation; update STATE.md; tick Phase 1 DoD items; add manual
   test scripts to docs/delivery/test-notes.md#phase-1 — deployed via
   npm run deploy:dev — covering (a) full four-level config against
   pradeep-de-silva.atlassian.net project ADT where available, and (b) an
   epic-root pair validated end-to-end on the free-tier site, including the
   coverage-rejection case (attempt a feature-root pair under an epic-only
   mapping and confirm the friendly error).

CONSTRAINTS
- No write scopes, no LLM code, no Confluence body parsing yet (existence
  check only).
- Resolvers stay under a few seconds; no queues needed this phase.

DELIVERABLE
PR "Phase 1: configuration & hierarchy mapping" + the manual test scripts.