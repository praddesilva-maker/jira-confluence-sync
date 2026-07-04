# Initiative Sync

A Forge app that treats a Jira Initiative hierarchy and a Confluence page tree as two views of one
plan, detects drift between them, uses an LLM to suggest content improvements, and syncs only
after human review. See `docs/design/solution-architecture.md` for the full design.

Status: **Phase 0** (scaffold only — no product scopes, no LLM, no writes). See `docs/STATE.md`.

## Prerequisites

- Node version pinned in `.nvmrc` (`nvm use`).
- A Forge-enabled Atlassian account with access to an Atlassian Cloud site (dev/staging install
  target). This repo's test site is `pradeep-de-silva.atlassian.net`.
- [Forge CLI](https://developer.atlassian.com/platform/forge/getting-started/) — no local install
  needed, invoked via `npx --package=@forge/cli forge ...` in the commands below.

## Dev quickstart

```bash
npm install
npm --prefix static/review-ui install

npm run typecheck   # backend + frontend
npm run lint        # backend + frontend
npm run test         # vitest
npm run build        # builds static/review-ui/dist (the manifest's Custom UI resource)
```

## Manual setup (first time, or on a machine that hasn't logged in to Forge)

These steps require Atlassian credentials and cannot be run by an agent without them:

```bash
npx --package=@forge/cli forge login
npx --package=@forge/cli forge register     # creates the app, prints a real app ARI
```

After `forge register`, replace the placeholder in `manifest.yml`:

```yaml
app:
  id: ari:cloud:ecosystem::app/00000000-0000-0000-0000-000000000000 # ← replace with the real value
```

Then:

```bash
npx --package=@forge/cli forge lint     # full validation, including platform-side checks
npx --package=@forge/cli forge deploy   # deploys the current code to the default environment
npx --package=@forge/cli forge install  # installs on pradeep-de-silva.atlassian.net
```

**Confirm success:** open Jira on `pradeep-de-silva.atlassian.net`, find **Initiative Sync** in the
global navigation, and open it. You should see the heading "Initiative Sync — Phase 0" followed by
a line showing the live result of the `ping()` resolver call (a "pong" message with a timestamp).
Full script: `docs/delivery/test-notes.md#phase-0`.

## Enabling staging deploy in CI

`.github/workflows/ci.yml` has a commented-out `deploy` job that runs `forge deploy -e staging` on
every push to `main`. To enable it:

1. Generate a Forge API token (`forge settings` / Atlassian account security settings).
2. Add it as a repository secret named `FORGE_API_TOKEN`.
3. Uncomment the `deploy` job in `.github/workflows/ci.yml`.

## Repository layout

See `docs/documentation-strategy.md` §1 for the full layout and the reasoning behind it. Short
version: `docs/STATE.md` is the single pickup file — read it before starting any session.
