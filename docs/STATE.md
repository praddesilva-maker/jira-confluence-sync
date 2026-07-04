# Project State — initiative-sync

_Last updated: 2026-07-04 (session 01)_

## Current phase

Phase 0 — Repo + docs skeleton + Forge scaffold. DoD: `docs/delivery/phase-plan.md#phase-0`

## What works right now

- Forge scaffold: `manifest.yml` declares `jira:globalPage` (Custom UI), one `resolver-func`
  function, `storage:app` scope only. Passes `forge lint`'s local schema validation (deeper
  platform-side checks need `forge login`, not available in this environment).
- Backend: `src/resolvers/ping.ts` (pure function) + `src/resolvers/index.ts` (Forge `Resolver`
  wiring). Unit-tested (`ping.test.ts` ✔).
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

1. **You** run the manual steps at the bottom of this session's summary (`forge login` →
   `forge register` → replace `manifest.yml`'s placeholder `app.id` → `forge deploy` →
   `forge install`) and confirm the global page loads per
   `docs/delivery/test-notes.md#phase-0`.
2. Once confirmed, tick the last Phase 0 DoD checkbox in `docs/delivery/phase-plan.md` and start
   Phase 1 with `prompts/phase-1-config.md`.
3. No code blockers — Phase 1 can start as soon as (1) is confirmed working.

## Known issues / parked

- `forge lint` could only be run to the local schema-validation stage in this session (no
  Atlassian login available to the agent). Full lint should be re-run by the user after
  `forge login`, before the first deploy.
- `manifest.yml`'s `app.id` is a placeholder UUID — **must** be replaced by the real value from
  `forge register` before any deploy.

## Decisions since last architecture update

- ADR-001: Custom UI on `jira:globalPage` (accepted).
- ADR-002: `asUser()` identity for all product API calls (accepted — pulled forward from the
  original Phase 1 plan; see `prompts/phase-1-config.md` amendment in this same PR).
- ADR-003: Forge LLMs API as primary LLM provider (accepted; renumbered from this phase's original
  prompt, which called it ADR-002 — see PR description for the numbering fix).

## How to run

`npm install && npm --prefix static/review-ui install`, then `npm run typecheck` / `npm run lint`
/ `npm run test` / `npm run build` at the repo root. Live verification requires
`forge login` (not available to the agent this session) — see the manual steps in the Phase 0
PR description and `docs/delivery/test-notes.md#phase-0`. Test site:
`pradeep-de-silva.atlassian.net`.
