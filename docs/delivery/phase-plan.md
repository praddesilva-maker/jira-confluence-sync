# Phase Plan — initiative-sync

Seven phases, drafted from `docs/design/solution-architecture.md` §14. Each phase ends installed
on `pradeep-de-silva.atlassian.net` and demoed against a copy of the ADT project. A phase is DONE
only when its checklist is fully ticked (`docs/documentation-strategy.md` §5).

## Phase 0 — Repo + docs skeleton + Forge scaffold ⟵ DONE

- [x] Forge app scaffolded: Custom UI `jira:globalPage`, TypeScript strict, `storage:app` scope only
- [x] One resolver (`ping`) wired end-to-end from Custom UI → resolver → response
- [x] `.nvmrc` pinned to local Node version
- [x] `CLAUDE.md` written with standing orders + the two hard rules (Forge LLMs API only; no whole-ADF regeneration)
- [x] Docs skeleton created (`STATE.md`, design stubs, ADR-000 template, delivery docs, sessions dir)
- [x] ADR-001 (Custom UI global page), ADR-002 (asUser identity), ADR-003 (Forge LLMs API provider)
- [x] Vitest wired with one passing sample test; ESLint + Prettier clean; npm scripts dev/build/test/lint/typecheck
- [x] GitHub Actions `ci` on pull_request (install, lint, typecheck, test); commented-out production deploy job
- [x] Manual verification: `forge register` + `forge deploy` + `forge install` completed by the user on `pradeep-de-silva.atlassian.net`, global page confirmed loading with a live `ping()` result
- [x] *(retro, CR-002)* Node 22.22.x pinned three ways: `.nvmrc`, `package.json` `engines` + `.npmrc` `engine-strict=true`, `scripts/check-node.mjs` — ADR-005
- [x] *(retro, CR-002)* Cross-platform deploy tooling (`scripts/deploy.mjs`, `scripts/check-node.mjs`, `scripts/lib/*`) — Node `.mjs` only, no OS-specific shell scripts — ADR-005
- [x] *(retro, CR-002)* Zero-client-credential deployment model documented and enforced (`deploy.config.json`/`.env` gitignored, example files committed, README "Deploying"/"Client onboarding") — ADR-006

## Phase 1 — Configuration: pair management, hierarchy mapping ⟵ CURRENT

Design refined during implementation: the hierarchy mapping is **one site-global config** (not
per-pair-conditional), and a pair's `rootLevel` is checked for *coverage* against it. See
`docs/design/data-model.md`.

- [x] Manifest scopes added: `read:jira-work`, `read:page:confluence`
- [x] `getHierarchyOptions()` resolver: site issue types grouped by hierarchy role (via Jira `hierarchyLevel`; levels above Epic legitimately empty on Standard/Free — valid data, not an error)
- [x] `saveHierarchyMapping()` resolver: validates the mapping is a contiguous run down to Story/Task, each role a distinct issue type (CR-001, ADR-004), persists to `config:global` — does **not** take a `rootLevel` argument (mapping is site-global)
- [x] `savePair()` resolver: pair includes `rootLevel` (`initiative | feature | epic`); validates in order — (a) coverage: mapping covers this `rootLevel`, (b) URL→pageId parsing (pretty + `/pages/<id>/`) + page existence check, (c) `jiraRootKey`/type validation against the mapped type for that `rootLevel` (not always "initiative") — persists to `config:pair:<id>`, typed validation errors (no throws)
- [x] `listPairs()`, `deletePair()`, `getConfig()` resolvers
- [x] `src/domain/model.ts`: `ItemType`, `RootLevel`, `WorkItem`, locators, `HierarchyMapping(Input)`, `PairConfig`, `HierarchyOption(sByRole)` — shared frontend/backend
- [x] Mapping-contiguity (`validateHierarchyMapping`) and pair-coverage (`checkPairCoverage`) validation as pure functions in `src/domain/hierarchy.ts`
- [x] Config screen UI: Hierarchy Mapping panel (select per role, unavailable roles disabled) + Pairs panel (list/add — root-level choice limited to what the mapping covers — /delete, inline validation), Atlaskit components
- [x] Vitest units: URL→pageId parsing edge cases (7 tests), mapping contiguity for all three shapes + gaps + duplicate types (9 tests), pair coverage for all three root levels incl. rejection under insufficient mapping (5 tests) — no real API calls, pure domain functions only
- [x] `docs/design/data-model.md` updated with implemented types, mapping-contiguity + pair-coverage rules, and KVS key layout
- [x] `docs/design/solution-architecture.md` §9 point 1 and the Q1 design-impact note updated to match the as-built (global mapping + coverage) model, per the `CLAUDE.md` staleness standing order
- [x] ADR-002 (`asUser()` identity) confirmed against the implementation — no amendment needed. ADR-004's "Hierarchy mapping becomes conditional" line is now stale but was **not** edited (never touch `docs/adr/` without being asked) — flagged in the PR description instead
- [x] `docs/STATE.md` updated; this checklist ticked
- [ ] Manual test scripts run against a live site (`docs/delivery/test-notes.md#phase-1`): full four-level config where the site's tier supports it, plus an epic-root pair end-to-end including the coverage-rejection case

## Phase 2 — Read-only extraction: Jira tree + Confluence ADF parse → canonical model

- [ ] Jira adapter: fetch the pair's root issue (whichever level `rootLevel` names — CR-001, ADR-004), traverse children breadth-first via `parent = <KEY>` JQL, paginated
- [ ] Confluence adapter: resolve page ID, fetch via v2 API (`body-format=atlas_doc_format`); enumerate child pages only when `rootLevel: initiative` — `feature`/`epic` roots read tables directly off the single root page (§5.2)
- [ ] ADF parser: `Summary`/`Description` heading convention, Epics table (present only for `initiative`/`feature` roots), Stories/Tasks table (incl. `Type` column) → `WorkItem[]` with locators
- [ ] Combined tree rendered in Custom UI (read-only), correct for all three root levels
- [ ] `docs/design/adf-conventions.md` filled in with exact ADF shapes + supported-node allowlist (Q2), including the three per-root page-model variants (CR-001, ADR-004)
- [ ] Vitest coverage for both adapters and the ADF parser (fixture-based, no live API calls), with fixtures for all three root levels
- [ ] Extraction verified for all three root modes — **epic mode on the owner's personal/free-tier site is the primary test bed** (CR-001)
- [ ] `docs/STATE.md` updated; checklist ticked; manual test script for `docs/delivery/test-notes.md#phase-2`

## Phase 3 — Diff engine + drift report UI (no LLM, no writes) — first genuinely useful release

- [ ] Diff engine covers all 7 drift statuses (unit-tested, incl. `KEY_CONFLICT` fixtures)
- [ ] Drift report persisted chunked to KVS; survives UI reload
- [ ] Review board renders grouped tree with status badges
- [ ] Direction defaults applied per architecture §4 table
- [ ] Manual test script executed on ADT test data (`docs/delivery/test-notes.md#phase-3`)
- [ ] Demo recorded/notes; `docs/STATE.md` updated; phase marked DONE

## Phase 4 — LLM enrichment: provider abstraction, Anthropic + Null providers, suggestion UX

- [ ] `llm` manifest module added (major version bump); `LLMProvider` interface implemented (`ForgeLLMProvider`, `NullProvider`)
- [ ] Enrich-worker: per-item/batch LLM calls, fan-out via Async Events API, suggestions appended to report
- [ ] Suggestion panel UI: original vs suggested, Accept/Edit/Reject per field
- [ ] Prompts versioned in `docs/design/llm-prompts.md`
- [ ] Vitest coverage for prompt assembly + suggestion parsing (LLM calls mocked)
- [ ] `docs/STATE.md` updated; checklist ticked; manual test script for `docs/delivery/test-notes.md#phase-4`

## Phase 5 — Sync execution: plan builder, sync-worker, write-backs, audit, completion report

- [ ] `SyncPlan` builder (item, direction, final field values, target locators, expected page versions)
- [ ] Sync-worker: surgical ADF writes, `createFeaturePage` + `relocateRows` for `MOVED` (Q5), optimistic concurrency (page version re-check, `STALE` exclusion — Q7)
- [ ] Per-item isolation: one failed item never rolls back or blocks others; retry via queue
- [ ] Audit entry per mutation (`who, when, item, direction, before-hash, after-hash`)
- [ ] Completion report UI
- [ ] Vitest coverage for plan building + write-back idempotency (product APIs mocked)
- [ ] `docs/STATE.md` updated; checklist ticked; manual test script for `docs/delivery/test-notes.md#phase-5` — run carefully, this phase writes to real data

## Phase 6 — Hardening & portability: scaffold action, error UX, multi-site install runbook, demo data

- [ ] "Create/repair page scaffold" action (self-installing page convention, §5.2)
- [ ] Error UX pass across config/compare/review/sync flows
- [ ] Multi-site install + client onboarding walkthrough executed against **at least two**
  distinct Atlassian sites using `scripts/deploy.mjs` (CR-002, ADR-005/ADR-006) — one exercising
  the operator-has-admin path, one exercising the installation-link path (README "Client
  onboarding"); README's "Deploying"/"Client onboarding" sections corrected against anything the
  walkthrough reveals
- [ ] Demo data / seed script for a fresh site
- [ ] `docs/STATE.md` updated; checklist ticked; phase marked DONE
