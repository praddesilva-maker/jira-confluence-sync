# Manual Test Notes — initiative-sync

One script per phase, run against `pradeep-de-silva.atlassian.net` unless a phase's script names a
different tier requirement (e.g. Phase 1's epic-root case, which needs a site *without* Premium
hierarchy levels). Forge apps need manual verification because the platform pieces (tunnel, deploy,
install, product UI) aren't unit-testable.

## Phase 0

Prerequisites: `forge login` completed, app registered (`forge register`), `manifest.yml`'s `app.id`
replaced with the real value.

**Superseded by the Phase 1 UI** (the ping demo was replaced by the Config screen — see below);
kept here as a historical record of what was verified for Phase 0's own sign-off. If you need to
re-check basic Custom UI → resolver plumbing in isolation, temporarily call `invoke('ping')` from
the browser console on the app's page instead.

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

Expected result: steps 4–5 pass with no console errors in the browser devtools. **Verified** —
Phase 0 is DONE (`docs/delivery/phase-plan.md#phase-0`).

## Phase 1

Prerequisites: Phase 0 verification above passed. Manifest gained `read:jira-work` and
`read:page:confluence` — `forge install --upgrade` will likely prompt to re-approve scopes on first
deploy after this PR; that prompt is expected, not an error.

1. `npm run deploy:dev` (or `forge deploy` + `forge install --upgrade`), then reload the Initiative
   Sync global page. Confirm it now shows **"Hierarchy Mapping"** and **"Pairs"** sections instead
   of the old ping demo.

### (a) Full four-level config — `pradeep-de-silva.atlassian.net`, project ADT

Run this if the site's tier exposes hierarchy levels above Epic; skip to (b) otherwise.

2. In **Hierarchy Mapping**, confirm all five role selects (Initiative, Feature, Epic, Story, Task)
   show real issue-type options from the site (not disabled).
3. Map each role to a distinct issue type and click **Save mapping**. Confirm no error appears and
   the selections persist after a page reload (re-fetched from `config:global`).
4. In **Pairs**, confirm the root-level select offers all three levels (Initiative, Feature, Epic).
5. Add a pair with `rootLevel: initiative`, a Confluence page URL from this site, and a Jira key of
   an issue matching the mapped Initiative type. Confirm it's added and appears in the pairs list.
6. Add a second pair with a **mismatched** Jira key (an issue whose type does *not* match the
   mapped Initiative type). Confirm a `TYPE_MISMATCH` error renders inline — the pair is not added.
7. Delete one of the pairs (confirm dialog appears); confirm it disappears from the list and
   `deletePair` succeeded.

### (b) Epic-root pair on a tier without Premium hierarchy levels

Run this on whichever site doesn't expose Initiative/Feature levels — works on Free/Standard tiers,
proving CR-001's whole point.

8. In **Hierarchy Mapping**, confirm the Initiative and Feature selects are disabled and labelled
   "Not available on this site" — this is expected, not a bug.
9. Map Epic, Story, and Task to real issue types and **Save mapping**. Confirm no error (the
   `epic/story/task` shape is valid on its own).
10. In **Pairs**, confirm the root-level select offers **only** "Epic" (Initiative/Feature aren't
    covered by this mapping).
11. Add an epic-root pair (a real Confluence page URL + a Jira key of an Epic-typed issue on this
    site). Confirm it saves successfully.
12. **Coverage-rejection case:** attempt to add a pair with `rootLevel: feature` (if the UI allows
    selecting it at all — it shouldn't be offered per step 10; if testing the resolver directly,
    call `savePair` with `rootLevel: 'feature'`). Confirm the friendly
    **`ROOT_LEVEL_NOT_COVERED`** error is shown ("mapping does not cover root level 'feature'"),
    not a raw exception or a silent failure.

Expected result: (a) steps 2–7 and (b) steps 8–12 all pass with no unhandled console errors.
