# Project State — initiative-sync

_Last updated: 2026-07-05 (Phase 1 implementation)_

## Current phase

Phase 1 — Configuration: pair management, hierarchy mapping. DoD:
`docs/delivery/phase-plan.md#phase-1`. Phase 0 is DONE — live-site verification passed (global
page confirmed rendering on `pradeep-de-silva.atlassian.net`). Phase 1 code is complete in this PR;
**live-site verification for Phase 1 is still outstanding** — see "In flight / next steps".

## What works right now

- **Phase 0** (scaffold, deploy tooling): DONE, verified on `pradeep-de-silva.atlassian.net`.
  `jira:globalPage` Custom UI + `ping` resolver, `scripts/deploy.mjs`/`check-node.mjs`, CI. See
  `docs/sessions/` and prior decisions below for the full history.
- **Phase 1 (this PR), code complete, not yet live-verified:**
  - Manifest scopes added: `read:jira-work`, `read:page:confluence` (`storage:app` already
    present). No write scopes yet.
  - Domain layer (`src/domain/`): `model.ts` (types — `ItemType`, `RootLevel`,
    `HierarchyMapping(Input)`, `PairConfig`, `HierarchyOption(sByRole)`, plus the not-yet-consumed
    `WorkItem`/locator types from the architecture doc), `hierarchy.ts`
    (`validateHierarchyMapping`, `checkPairCoverage` — pure functions), `confluence-url.ts`
    (`parseConfluencePageUrl` — pure function). See `docs/design/data-model.md` for the exact
    contiguity/coverage rules.
  - Resolvers (`src/resolvers/config.ts`, all `asUser()`): `getHierarchyOptions` (groups the
    site's issue types by role via Jira's `hierarchyLevel` — assumes level 2 = Feature, level 3 =
    Initiative when present, a simplifying assumption for this project's fixed 4-role model, noted
    in code), `saveHierarchyMapping`, `savePair` (coverage → URL parse/page-exists → issue
    type-match, in that order, typed errors not throws), `listPairs`, `deletePair`, `getConfig`.
  - Frontend (`static/review-ui/src/{ConfigScreen,HierarchyMappingPanel,PairsPanel}.tsx`):
    Hierarchy Mapping panel (Atlaskit `Select` per role, disabled + labelled "Not available on
    this site" for roles with no options) and Pairs panel (root-level choice limited to what the
    saved mapping currently covers, add/delete, inline error messages). Added Atlaskit `select`,
    `button` (new API, `@atlaskit/button/new`), `textfield`, `section-message`, `spinner`.
  - Tests: 43 total (21 new — 14 for mapping contiguity/coverage, 7 for URL parsing), all pure
    domain-layer unit tests per `CLAUDE.md`; no resolver-level tests (out of this phase's explicit
    test scope, which named URL parsing + mapping/coverage validation only).
  - `npm run typecheck` / `lint` / `test` / `build` all green, `forge lint` clean, locally — **none
    of Phase 1 has been exercised against a live Atlassian site yet.**
- Tooling/CI/deploy tooling from Phase 0 + CR-002 unchanged and still green (`check:node`,
  ESLint 9, Prettier, `scripts/deploy.mjs`).

## In flight / next 1–3 steps

Phase 1 code is complete on this PR's branch (`phase-1/config`), not yet merged. Once merged,
**live-site verification is the only remaining item.**

1. Merge the "Phase 1: configuration & hierarchy mapping" PR.
2. **You** run `npm run deploy:dev` (deploys the new scopes + resolvers + Config screen).
   Re-approving scopes may prompt on first install after the manifest scope change — expected.
3. **You** run the manual test scripts in `docs/delivery/test-notes.md#phase-1`:
   (a) full four-level mapping + an `initiative`-root pair against
   `pradeep-de-silva.atlassian.net` project ADT (where the site's tier supports it), and
   (b) an `epic`-root pair end-to-end (works regardless of tier — `epic` is the floor), including
   deliberately attempting a `feature`-root pair under an `epic`-only mapping and confirming the
   friendly `ROOT_LEVEL_NOT_COVERED` error appears instead of a raw failure.
4. Once (3) passes: tick the Phase 1 DoD checklist in `docs/delivery/phase-plan.md`, then start
   Phase 2 (read-only extraction) — no code blockers.

## Known issues / parked

- [#3](https://github.com/praddesilva-maker/jira-confluence-sync/issues/3): GitHub Actions
  deprecation warning (`actions/checkout@v4`/`actions/setup-node@v4` forced onto Node 24). Not
  blocking — CI still passes — parked for a future workflow bump.

## Decisions since last architecture update

- ADR-001: Custom UI on `jira:globalPage` (accepted).
- ADR-002: `asUser()` identity for all product API calls (accepted — pulled forward from the
  original Phase 1 plan; see `prompts/phase-1-config.md` amendment in this same PR).
- ADR-003: Forge LLMs API as primary LLM provider (accepted; renumbered from this phase's original
  prompt, which called it ADR-002 — see PR description for the numbering fix).
- **CR-001 / ADR-004** (docs-only, no code yet): hierarchy root is now configurable per pair
  (`initiative | feature | epic`, CR-001), reversing Q1's hard Jira Premium assumption — `epic` is
  the minimum and needs no Premium levels. Reverses `docs/design/solution-architecture.md` §13 Q1
  in place (marked "Reversed", not deleted, per the ADR append-only convention). Now implemented in
  Phase 1 — see below.
- **CR-002 / ADR-005 / ADR-006** (`scripts/`, no `manifest.yml` or app runtime changes): real
  deploy/install tooling. ADR-005: all tooling is plain Node `.mjs` invoked via `npm run`, never
  OS-specific shell scripts — Windows and Mac/Linux operators run the same commands. ADR-006: zero
  client credentials anywhere in the model — the only token in play is the operator's own, used
  solely to authenticate the Forge CLI; client-site access comes exclusively from manifest OAuth
  scopes approved once at install, via either an automated install (operator has admin) or an
  installation link (operator doesn't). `deploy.config.json`/`.env` are real-config, gitignored,
  with committed `.example` templates.
- **Merge-day incident and lesson:** squash-merging PR #1 broke the git ancestry that PR #2 (and
  transitively PR #4) relied on — GitHub computes a PR's diff/mergeability from the merge-base with
  its target branch, and a squash merge creates a new commit with no ancestry link to the original
  branch's individual commits. Deleting the now-merged parent branch to trigger GitHub's
  auto-retarget instead **auto-closed** the child PR (it didn't retarget as expected). Recovered by:
  temporarily restoring the deleted branch to allow reopening the PR, explicitly setting its base
  to `main` via the API, then merging `origin/main` into the branch (an ordinary merge commit, not
  a rebase — no force-push) to give it correct ancestry before re-verifying the diff and re-merging.
  Same recovery repeated for PR #4. **Lesson, now in `CLAUDE.md`:** for stacked PRs, always
  explicitly retarget the child PR's base before deleting the parent branch — never rely on
  GitHub's auto-retarget.
- **Phase 1 implements CR-001/ADR-004** with one refinement over the original ADR-004 text: the
  hierarchy mapping is **one site-global config** (not per-pair-conditional as ADR-004's
  Consequences section describes) — a pair's `rootLevel` is checked for *coverage* against that one
  mapping instead. See `docs/design/data-model.md` for the rule and `solution-architecture.md` §9
  point 1 (updated in this PR per the `CLAUDE.md` staleness standing order). **ADR-004 itself was
  not edited** (never touch `docs/adr/` without being asked) — its "Hierarchy mapping becomes
  conditional" line is now stale and should be corrected if/when the user asks for an ADR-004
  amendment or a new ADR. ADR-002 (`asUser()` identity) was confirmed against the implementation —
  every product call in `src/resolvers/config.ts` uses `asUser()`; no amendment needed.

## How to run

`npm install && npm --prefix static/review-ui install`, then `npm run typecheck` / `npm run lint`
/ `npm run test` / `npm run build` at the repo root (`npm run check:node` verifies you're on
22.22.x first — all of the above assume that). For live verification: `cp
deploy.config.example.json deploy.config.json` (fill in your site), then `npm run deploy:dev`, per
`docs/delivery/test-notes.md#phase-0` (Phase 0) and `#phase-1` (this phase). Test site:
`pradeep-de-silva.atlassian.net`, project ADT — full four-level mapping where the site's tier
supports it, an epic-root pair otherwise.
