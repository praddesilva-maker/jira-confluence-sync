# Phase Plan — initiative-sync

Seven phases, drafted from `docs/design/solution-architecture.md` §14. Each phase ends installed
on `pradeep-de-silva.atlassian.net` and demoed against a copy of the ADT project. A phase is DONE
only when its checklist is fully ticked (`docs/documentation-strategy.md` §5).

## Phase 0 — Repo + docs skeleton + Forge scaffold ⟵ CURRENT

- [x] Forge app scaffolded: Custom UI `jira:globalPage`, TypeScript strict, `storage:app` scope only
- [x] One resolver (`ping`) wired end-to-end from Custom UI → resolver → response
- [x] `.nvmrc` pinned to local Node version
- [x] `CLAUDE.md` written with standing orders + the two hard rules (Forge LLMs API only; no whole-ADF regeneration)
- [x] Docs skeleton created (`STATE.md`, design stubs, ADR-000 template, delivery docs, sessions dir)
- [x] ADR-001 (Custom UI global page), ADR-002 (asUser identity), ADR-003 (Forge LLMs API provider)
- [x] Vitest wired with one passing sample test; ESLint + Prettier clean; npm scripts dev/build/test/lint/typecheck
- [x] GitHub Actions `ci` on pull_request (install, lint, typecheck, test); commented-out staging deploy job
- [ ] Manual verification: `forge register` + `forge deploy` + `forge install` completed by the user on `pradeep-de-silva.atlassian.net`, global page confirmed loading with a live `ping()` result

## Phase 1 — Configuration: pair management, hierarchy mapping

- [ ] Manifest scopes added: `read:jira-work`, `read:page:confluence`
- [ ] `getHierarchyOptions()` resolver: site issue types grouped by hierarchy level
- [ ] `saveHierarchyMapping()` resolver: validates all four roles mapped to distinct types, persists to `config:global`
- [ ] `savePair()` resolver: URL→pageId parsing (pretty + `/pages/<id>/`), page existence check, Jira key/type validation, persists to `config:pair:<id>`, typed validation errors (no throws)
- [ ] `listPairs()`, `deletePair()`, `getConfig()` resolvers
- [ ] `src/domain/model.ts`: `ItemType`, `WorkItem`, locators, `HierarchyMapping`, `InitiativePair` — shared frontend/backend
- [ ] Config screen UI: Hierarchy Mapping panel (four selects) + Initiative Pairs panel (list/add/delete, inline validation), Atlaskit components
- [ ] Vitest units: URL→pageId parsing edge cases, mapping validation — `@forge/api` mocked, no real API calls in tests
- [ ] `docs/design/data-model.md` updated with implemented types + KVS key layout
- [ ] `docs/STATE.md` updated; this checklist ticked; manual test script added to `docs/delivery/test-notes.md#phase-1`

## Phase 2 — Read-only extraction: Jira tree + Confluence ADF parse → canonical model

- [ ] Jira adapter: fetch Initiative, traverse children breadth-first via `parent = <KEY>` JQL, paginated
- [ ] Confluence adapter: resolve page ID, fetch via v2 API (`body-format=atlas_doc_format`), enumerate child pages
- [ ] ADF parser: `Summary`/`Description` heading convention, Epics table, Stories/Tasks table (incl. `Type` column) → `WorkItem[]` with locators
- [ ] Combined tree rendered in Custom UI (read-only)
- [ ] `docs/design/adf-conventions.md` filled in with exact ADF shapes + supported-node allowlist (Q2)
- [ ] Vitest coverage for both adapters and the ADF parser (fixture-based, no live API calls)
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
- [ ] Multi-site install runbook (README)
- [ ] Demo data / seed script for a fresh site
- [ ] `docs/STATE.md` updated; checklist ticked; phase marked DONE
