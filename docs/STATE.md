# Project State — initiative-sync

_Last updated: 2026-07-04 (session 01)_

## Current phase

Phase 0 — Repo + docs skeleton + Forge scaffold. DoD: `docs/delivery/phase-plan.md#phase-0`

## What works right now

- Forge scaffold: `manifest.yml` declares `jira:globalPage` (Custom UI), one `resolver-func`
  function, `storage:app` scope only. App registered (`forge register`) to the `praddesilva-dev`
  Developer Space; real `app.id` is in `manifest.yml`. `forge lint` passes with **no issues**
  (verified after registration, with the user logged in).
- Backend: `src/resolvers/ping.ts` (pure function) + `src/resolvers/index.ts` (Forge `Resolver`
  wiring). Unit-tested (`ping.test.ts` ✔). Handler path in `manifest.yml` is
  `resolvers/index.handler` — Forge always resolves function handlers relative to an implicit
  `src/` root, so the manifest path must **omit** the `src/` prefix (learned the hard way: `index.
  handler` and `src/resolvers/index.handler` both failed `forge lint` with "cannot find associated
  file").
- Frontend: `static/review-ui` (React 18 + Vite, `@forge/bridge`) renders "Initiative Sync —
  Phase 0" and calls `invoke('ping')`, showing the live response. `npm run build` produces
  `static/review-ui/dist` matching the manifest's resource path. Verified locally end-to-end
  (typecheck, lint, test, build all pass) — **not yet verified against a live Atlassian site**,
  since this session had no Atlassian credentials.
- Tooling: Vitest (1 passing test), ESLint 9 flat config + Prettier (root + `static/review-ui`,
  both clean), `npm run {dev,build,test,lint,typecheck}` at root.
- CI: `.github/workflows/ci.yml` runs install/lint/typecheck/test on every PR. Staging deploy job
  is present but commented out (needs `FORGE_API_TOKEN` secret — see README).

## In flight / next 1–3 steps

1. **Merge PR #1** (`phase-0/scaffold` → `main`, "Phase 0: scaffold + docs skeleton").
2. **Merge PR #2** (`cr-001/configurable-root`, "CR-001: configurable hierarchy root (docs)")
   after it auto-retargets to `main` once #1 merges — it currently targets `phase-0/scaffold`
   because the docs it edits only existed there.
3. **Run Phase 0 manual verification:**
   ```bash
   npx --package=@forge/cli forge deploy    # development environment
   npx --package=@forge/cli forge install   # target pradeep-de-silva.atlassian.net
   ```
   Then confirm the global page renders on `pradeep-de-silva.atlassian.net` per
   `docs/delivery/test-notes.md#phase-0` (`forge login`/`forge register` are already done;
   `forge lint` passes clean). Once confirmed, tick the last Phase 0 DoD checkbox in
   `docs/delivery/phase-plan.md` and start Phase 1 with `prompts/phase-1-config.md`.

No code blockers — Phase 1 can start as soon as (3) is confirmed working.

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
  in place (marked "Reversed", not deleted, per the ADR append-only convention). `prompts/phase-1-
  config.md` and `docs/delivery/phase-plan.md` (Phases 1–2) are already updated for this — Phase 1
  implementation isn't started yet, so there's no code drift to reconcile.

## How to run

`npm install && npm --prefix static/review-ui install`, then `npm run typecheck` / `npm run lint`
/ `npm run test` / `npm run build` at the repo root. For live verification: `npm run build` then
`forge deploy` + `forge install`, per `docs/delivery/test-notes.md#phase-0`. Test site:
`pradeep-de-silva.atlassian.net`.
