# Documentation Strategy — initiative-sync

**Goal:** any vibing session — yours or Claude's — can cold-start in under 2 minutes by reading one
file, and every session leaves the repo in a state the next session can trust.

The strategy is **docs-as-code**: all documentation lives in the repo, is updated in the same
commits/PRs as the code it describes, and is written *for Claude as much as for you* — because
Claude Code is your developer and these documents are its long-term memory.

---

## 1. Repository layout

```
initiative-sync/
├── CLAUDE.md                     ← standing instructions for Claude Code (see §3)
├── README.md                     ← what the app is, install, dev quickstart
├── .nvmrc                        ← pin your working Node 22 version
├── docs/
│   ├── STATE.md                  ← ★ THE pickup file (see §2)
│   ├── design/
│   │   ├── solution-architecture.md   ← the architecture doc (v-controlled, updated as built)
│   │   ├── data-model.md              ← canonical model, storage keys, drift statuses
│   │   ├── adf-conventions.md         ← page scaffold + table conventions (exact ADF shapes)
│   │   └── llm-prompts.md             ← the actual prompts the app sends to the LLM, versioned
│   ├── adr/
│   │   ├── ADR-000-template.md
│   │   ├── ADR-001-forge-custom-ui-global-page.md
│   │   ├── ADR-002-asuser-identity.md
│   │   ├── ADR-003-llm-provider-abstraction-and-egress.md
│   │   └── ...one per irreversible-ish decision
│   ├── delivery/
│   │   ├── phase-plan.md              ← phases 0–6, DoD checklists, current phase marked
│   │   └── test-notes.md              ← manual test scripts per phase (Forge apps need these)
│   └── sessions/
│       └── 2026-07-DD-session-NN.md   ← one short log per vibing session
├── prompts/
│   ├── session-start.md          ← reusable, paste at start of every session
│   ├── session-end.md            ← reusable, paste at end of every session
│   └── phase-N-*.md              ← the implementation prompts (archive of what was issued)
├── src/ ...
└── manifest.yml
```

## 2. STATE.md — the single pickup file

Rule: **STATE.md is always true.** It is updated as the last act of every session (the session-end
prompt enforces this). Keep it under ~1 page; history goes in session logs, not here.

Template:

```markdown
# Project State — initiative-sync
_Last updated: <date> (session NN)_

## Current phase
Phase 2 — Read-only extraction. DoD: docs/delivery/phase-plan.md#phase-2

## What works right now
- Config screen saves/validates pairs (Phase 1 DONE, demoed <date>)
- Jira adapter returns full tree for ADT-1 ✔
- Confluence adapter: page fetch ✔, table parsing ✘ (in progress)

## In flight / next 1–3 steps
1. Finish ADF table parser — rowspan edge case failing (test: adf-parser.test.ts#L88)
2. Wire parser output into canonical model
3. Render combined tree in UI

## Known issues / parked
- Confluence v2 children endpoint pagination not handled yet (fine <25 pages)

## Decisions since last architecture update
- ADR-004: Type column added to story/task table (Q3 resolved)

## How to run
forge tunnel + `npm run dev` in /static/review-ui  ·  test site: pradeep-de-silva.atlassian.net
```

## 3. CLAUDE.md — standing orders for your developer

Lives at repo root; Claude Code reads it automatically every session. Contents:

- One-paragraph project summary + pointer: *"Read `docs/STATE.md` before doing anything."*
- Tech constraints: Forge platform limits (25s resolvers, queue workers with `timeoutSeconds: 900`),
  Node version, TypeScript strict, no `asApp()` for product writes, never regenerate whole ADF docs.
- Workflow rules: small commits with conventional-commit messages; update STATE.md + relevant
  design doc **in the same PR** as any behaviour change; add/extend Vitest tests for all domain
  logic; never touch `docs/adr/` without being asked; ask before adding scopes to `manifest.yml`.
- Definition of done for any task: code + tests green + docs updated + STATE.md current.

## 4. ADRs — decision memory

One short ADR (Context / Decision / Consequences, ~½ page) whenever you choose between real
alternatives: module type, identity model, egress, table conventions, deletion policy, etc.
ADRs are append-only — superseded ones get a `Superseded by ADR-0NN` header, never deleted.
This is what lets you (or a client's architect) reconstruct *why* six weeks later.

## 5. Phase plan with Definition of Done

`docs/delivery/phase-plan.md` holds the 7 phases from the architecture doc, each with a DoD
checklist, e.g.:

```markdown
## Phase 3 — Diff engine + drift report UI          ⟵ CURRENT
- [ ] Diff engine covers all 7 drift statuses (unit-tested, incl. KEY_CONFLICT fixtures)
- [ ] Drift report persisted chunked to KVS; survives UI reload
- [ ] Review board renders grouped tree with status badges
- [ ] Direction defaults applied per architecture §4 table
- [ ] Manual test script executed on ADT test data (docs/delivery/test-notes.md#phase-3)
- [ ] Demo recorded/notes; STATE.md updated; phase marked DONE
```

A phase is DONE only when the checklist is fully ticked — this is your personal stage gate and it
maps 1:1 to a GitHub milestone (and, if you like, to Epics in your ADT Jira project so your
transition-plan tracking and this build stay in one governance view).

## 6. Session logs — the vibing journal

One tiny file per session (`docs/sessions/`), created by the session-end prompt:

```markdown
# Session 07 — 2026-07-19 (~2h)
**Goal:** finish ADF table parser
**Done:** parser handles merged cells; 14 new tests; PR #12 merged
**Blocked/parked:** Confluence pagination (issue #13 raised)
**Next session should start with:** wiring parser → canonical model (STATE.md step 1)
```

Cheap to write, gold when you return after a two-week contract crunch.

## 7. GitHub mechanics

- **Branches:** `phase-N/short-description`, PR to `main`, squash-merge. Even solo, PRs give you a
  reviewable diff to sanity-check Claude's work and a place CI runs.
- **CI (GitHub Actions):** on PR — lint, `tsc --noEmit`, Vitest; on merge to main —
  `forge deploy -e staging` using a `FORGE_API_TOKEN` repo secret.
- **Issues:** anything parked mid-session becomes a GitHub issue immediately (session-end prompt
  enforces), labelled by phase.
- **Releases:** tag at each phase completion (`v0.3.0-phase3`) so you can always install a known-good
  build for a demo.

## 8. The documentation loop per session

```
START:  paste prompts/session-start.md
        → Claude reads CLAUDE.md + STATE.md + phase-plan, restates plan, you confirm
WORK:   implementation prompts (phase prompt or ad hoc), small PR-sized chunks
END:    paste prompts/session-end.md
        → Claude updates STATE.md, writes session log, raises issues for parked items,
          confirms tests green, lists exact next steps
```

If a session ends abruptly (life happens), the worst case is one missing session log —
STATE.md was updated at the last merged PR, so recovery cost stays near zero.