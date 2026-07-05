# Project State — initiative-sync

_Last updated: 2026-07-05 (post-session-01 + CR-001 + CR-002, all merged to `main`)_

## Current phase

Phase 0 — Repo + docs skeleton + Forge scaffold. **Code complete and merged to `main`** (PRs #1,
#2, #4 all merged). DoD: `docs/delivery/phase-plan.md#phase-0` — one checkbox remains: live-site
verification, which is **OUTSTANDING** (nothing has been deployed or installed to a real
Atlassian site yet). See "In flight / next steps" below.

## What works right now

All of the below is merged to `main` and verified locally (typecheck/lint/test/build all green on
`main` directly, not just in CI) — **none of it has been exercised against a live Atlassian site
yet.**

- Forge scaffold: `manifest.yml` declares `jira:globalPage` (Custom UI), one `resolver-func`
  function, `storage:app` scope only. App registered (`forge register`) to the `praddesilva-dev`
  Developer Space; real `app.id` is in `manifest.yml`. `forge lint` passes with **no issues**.
- Backend: `src/resolvers/ping.ts` (pure function) + `src/resolvers/index.ts` (Forge `Resolver`
  wiring). Unit-tested (`ping.test.ts` ✔). Handler path in `manifest.yml` is
  `resolvers/index.handler` — Forge always resolves function handlers relative to an implicit
  `src/` root, so the manifest path must **omit** the `src/` prefix (learned the hard way: `index.
  handler` and `src/resolvers/index.handler` both failed `forge lint` with "cannot find associated
  file").
- Frontend: `static/review-ui` (React 18 + Vite, `@forge/bridge`) renders "Initiative Sync —
  Phase 0" and calls `invoke('ping')`, showing the live response. `npm run build` produces
  `static/review-ui/dist` matching the manifest's resource path.
- Tooling: Vitest (22 passing tests across `src/` + `scripts/lib/`), ESLint 9 flat config +
  Prettier (root + `static/review-ui`, both clean), `npm run {dev,build,test,lint,typecheck}` at
  root.
- CI: `.github/workflows/ci.yml` runs `check:node`/install/lint/typecheck/test on every PR.
  Production deploy job is present but commented out (needs `FORGE_EMAIL`/`FORGE_API_TOKEN`
  secrets and a `deploy.config.json` strategy — see README).
- **Deploy tooling (CR-002, ADR-005, ADR-006):** `scripts/deploy.mjs` + `scripts/check-node.mjs`,
  both plain Node `.mjs` (no `.sh`/`.ps1`/`.bat` anywhere). Node 22.22.x pinned three ways
  (`.nvmrc`, `package.json` `engines` + `.npmrc` `engine-strict`, `scripts/check-node.mjs`).
  `deploy.config.example.json`/`.env.example` committed; the real `deploy.config.json`/`.env` are
  gitignored (verified: `git check-ignore` confirms both, no secrets in any committed file).
  `npm run deploy:dev` / `deploy:prod` — the latter requires typed `"production"` confirmation
  unless `--yes`. Zero-client-credential model: only the operator's own Forge CLI token is ever
  used; client sites get either automated install (operator has admin) or an installation link
  (operator doesn't) — see README "Client onboarding".

## In flight / next 1–3 steps

PRs #1, #2, #4 are all merged to `main`. The only thing left before Phase 1 starts is **live-site
verification — nothing has been deployed or installed anywhere yet.** Next steps, exactly:

1. **You** create `deploy.config.json` and `.env` from the committed examples
   (`cp deploy.config.example.json deploy.config.json` and `cp .env.example .env`, then fill in
   your site and Forge CLI credentials — see README "Deploying").
2. **You** run `npm run check:node`, then `npm run deploy:dev`.
3. **You** confirm the "Initiative Sync — Phase 0" global page renders on
   `pradeep-de-silva.atlassian.net`, showing the live `ping()` result (full script:
   `docs/delivery/test-notes.md#phase-0`).

Once (3) passes: tick the last Phase 0 DoD checkbox in `docs/delivery/phase-plan.md`, then (not
before) tag the baseline release and start Phase 1 with `prompts/phase-1-config.md`. No code
blockers — Phase 1 can start as soon as (3) is confirmed working.

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

## How to run

`npm install && npm --prefix static/review-ui install`, then `npm run typecheck` / `npm run lint`
/ `npm run test` / `npm run build` at the repo root (`npm run check:node` verifies you're on
22.22.x first — all of the above assume that). For live verification: `cp
deploy.config.example.json deploy.config.json` (fill in your site), then `npm run deploy:dev`, per
`docs/delivery/test-notes.md#phase-0`. Test site: `pradeep-de-silva.atlassian.net`.
