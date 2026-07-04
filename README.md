# Initiative Sync

A Forge app that treats a Jira hierarchy — rooted at a configurable level: Initiative, Feature, or
Epic (CR-001, ADR-004) — and a matching Confluence page tree as two views of one plan, detects
drift between them, uses an LLM to suggest content improvements, and syncs only after human
review. See `docs/design/solution-architecture.md` for the full design.

Status: **Phase 0** (scaffold only — no product scopes, no LLM, no writes). See `docs/STATE.md`.

## Prerequisites

- **Node 22.22.x, exactly** (`engines.node` in `package.json`, enforced by `.npmrc`'s
  `engine-strict=true` and by `npm run check:node` / every `scripts/*.mjs` tool). Install via:
  - **macOS/Linux:** [nvm](https://github.com/nvm-sh/nvm) → `nvm install 22.22.0 && nvm use`
    (reads `.nvmrc`).
  - **Windows:** [nvm-windows](https://github.com/coreybutler/nvm-windows) →
    `nvm install 22.22.0 && nvm use 22.22.0`.
- A Forge-enabled Atlassian account with access to an Atlassian Cloud site (dev/staging install
  target). This repo's test site is `pradeep-de-silva.atlassian.net`.
- [Forge CLI](https://developer.atlassian.com/platform/forge/getting-started/) — no local install
  needed, invoked via `npx --package=@forge/cli forge ...` (directly, or through
  `scripts/deploy.mjs` — see "Deploying" below).

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

## Deploying

Deploys and installs are driven by `scripts/deploy.mjs` (plain Node ESM — no `.sh`/`.ps1`/`.bat`
scripts anywhere in this repo, so the same tooling runs unmodified on Windows and Mac/Linux; see
ADR-005). It always checks the Node version first, then runs `forge lint` → `forge deploy` → one
`forge install` (or `--upgrade`) per configured site/product, printing a pass/fail summary table.

**First-time setup (either OS):**

1. Install and select Node 22.22.x — see "Prerequisites" above (`nvm use` on macOS/Linux,
   `nvm use 22.22.0` on Windows with nvm-windows).
2. `cp deploy.config.example.json deploy.config.json` (both gitignored — never commit) and fill in
   your site(s) per environment. One entry per Atlassian site; each site hosts both Jira and
   Confluence, listed in `products`.
3. `cp .env.example .env` and fill in `FORGE_EMAIL` / `FORGE_API_TOKEN` — **your own** Atlassian
   account and Forge CLI API token, only needed for non-interactive use (CI, scripted runs);
   `forge login`'s local keychain session works fine for interactive local use without a `.env` at
   all. See ADR-006 — no client's credentials are ever used or stored here.
4. `npx --package=@forge/cli forge login` and `forge register` once per app (see "Manual setup"
   above) if you haven't already.

**Running a deploy:**

```bash
npm run deploy:dev              # forge deploy + install to every site under "development"
npm run deploy:dev -- --site prad-personal   # ...just one site
npm run deploy:prod             # prompts: type "production" to confirm
npm run deploy:prod -- --yes    # skips the prompt (CI use only)
```

### Client onboarding

Each client site is one entry under an environment in `deploy.config.json`. There are two
installation paths, depending on whether the operator running `deploy.mjs` has site-admin rights
on that client's Atlassian site:

- **(a) Operator has site admin on the client site:** `scripts/deploy.mjs` handles deploy *and*
  install end-to-end — `forge install --confirm-scopes` in the script accepts the manifest's scope
  request on the client's behalf, same as any other configured site.
- **(b) Operator lacks admin on the client site:** the script deploys the app version but the
  install step fails with a permission error, which `deploy.mjs` reports as *"deploy succeeded;
  install requires site admin — use the installation-link path"* rather than a raw CLI error. In
  that case, generate an installation link instead:

  ```bash
  npx --package=@forge/cli forge install list -e <environment>   # confirm the deployed version
  npx --package=@forge/cli forge install --site <client-site> --product <jira|confluence>
  ```
  Running `forge install` interactively (no `--non-interactive`) against a site you don't administer
  prints a shareable installation link from the Forge developer console flow — send that link to
  the client's site admin, who completes the install and scope approval themselves.

**No client API tokens exist anywhere in this model** (ADR-006). The only credential in play is
the operator's own Atlassian API token, used solely to authenticate the Forge CLI for deploy/
install. Once installed, the app's runtime access to a client's Jira/Confluence comes exclusively
from the OAuth scopes declared in `manifest.yml` and approved once by that client's admin at
install time; every subsequent product call runs `asUser()` as whichever human is using the app
(ADR-002). No credentials cross the client boundary in either direction.

## Enabling production deploy in CI

`.github/workflows/ci.yml` has a commented-out `deploy` job that runs
`node scripts/deploy.mjs --env production --yes` on every push to `main`. To enable it:

1. Generate a Forge API token for the **operator** account (`forge settings` / Atlassian account
   security settings) — never a client's.
2. Add repository secrets `FORGE_EMAIL` and `FORGE_API_TOKEN`.
3. `deploy.config.json` is gitignored, so CI needs its own copy — either add its contents as a
   repository secret and write it to `deploy.config.json` in a step before the deploy step, or
   check in a CI-only variant via a protected path outside this repo. Pick whichever your
   client-confidentiality posture prefers; this repo doesn't prescribe one.
4. Uncomment the `deploy` job in `.github/workflows/ci.yml`.

## Repository layout

See `docs/documentation-strategy.md` §1 for the full layout and the reasoning behind it. Short
version: `docs/STATE.md` is the single pickup file — read it before starting any session.
