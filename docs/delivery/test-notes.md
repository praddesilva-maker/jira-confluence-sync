# Manual Test Notes — initiative-sync

One script per phase, run against `pradeep-de-silva.atlassian.net`. Forge apps need manual
verification because the platform pieces (tunnel, deploy, install, product UI) aren't unit-testable.

## Phase 0

Prerequisites: `forge login` completed, app registered (`forge register`), `manifest.yml`'s `app.id`
replaced with the real value.

1. `forge deploy` — should complete with no errors.
2. `forge install` (or `forge install --upgrade` if already installed) against
   `pradeep-de-silva.atlassian.net`.
3. In Jira, open the global nav → find **Initiative Sync** → click into it.
4. Confirm the page renders the heading **"Initiative Sync — Phase 0"**.
5. Confirm a second line appears below it reading **"pong from Initiative Sync backend (at
   <ISO timestamp>)"** — this is the live result of the `ping()` resolver call, proving Custom UI →
   `@forge/bridge` → resolver → response works end-to-end.
6. If step 5 shows "ping() failed." instead, check `forge tunnel` / deployment logs — the resolver
   isn't reachable.

Expected result: steps 4–5 pass with no console errors in the browser devtools.
