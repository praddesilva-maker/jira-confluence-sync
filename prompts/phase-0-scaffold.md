You are the developer on the initiative-sync Forge app. This is session 01 —
the repo contains committed documentation but no code yet.

FIRST, read in this order and do not write any code until you have:
1. CLAUDE.md placeholder status (may not exist yet — you will create it below)
2. docs/design/solution-architecture.md   ← the authoritative design, v0.2
3. docs/documentation-strategy.md         ← how this project is run
4. prompts/session-start.md and prompts/session-end.md ← the session protocol
   we will use from session 02 onward

Then restate in ≤8 lines: the app's purpose, the module architecture
(resolvers vs queue workers), the LLM decision (Forge LLMs API), and the
7 phases. If anything in the docs is ambiguous or contradictory, ask me
before proceeding.

THEN implement Phase 0. Work in small conventional commits on branch
phase-0/scaffold, PR to main titled "Phase 0: scaffold + docs skeleton".

TASKS
1. Scaffold a Forge app: Custom UI jira:globalPage template, TypeScript
   strict. Manifest: title "Initiative Sync"; scope storage:app ONLY (product
   scopes arrive in Phase 1); one resolver with ping(); the global page
   renders "Initiative Sync — Phase 0" plus ping()'s result.
2. Create .nvmrc pinned to the local Node 22 version (`node -v`).
3. Create CLAUDE.md with standing orders derived from
   docs/documentation-strategy.md §3, PLUS these two hard rules:
   (a) runtime LLM is the Forge LLMs API via the `llm` manifest module —
   never add external.fetch egress without an ADR; (b) never regenerate
   whole ADF documents — surgical node edits only.
4. Create the remaining skeleton WITHOUT touching existing files:
   docs/STATE.md, docs/design/{data-model.md,adf-conventions.md,
   llm-prompts.md}, docs/adr/ADR-000-template.md,
   docs/delivery/{phase-plan.md,test-notes.md}, docs/sessions/.gitkeep.
   phase-plan.md: 7 phases with DoD checklists drafted from
   solution-architecture.md §14 — mark Phase 0 as CURRENT.
5. Write ADR-001 (Custom UI on jira:globalPage — rich diff/review UI;
   works before any Confluence page exists) and ADR-002 (Forge LLMs API as
   primary provider — zero egress, Runs on Atlassian, NullProvider fallback;
   ref architecture §8/§13-Q4).
6. Tooling: Vitest with one passing sample test; ESLint + Prettier;
   npm scripts dev/build/test/lint/typecheck.
7. GitHub Actions "ci" on pull_request: install, lint, typecheck, test.
   Commented-out staging deploy job using secret FORGE_API_TOKEN, with a
   README note on enabling it.
8. Fill docs/STATE.md truthfully for end of Phase 0; tick completed DoD
   items.

CONSTRAINTS
- No Jira/Confluence scopes or API calls. No LLM SDKs or Atlaskit yet.
- forge lint clean, tests green, typecheck green.
- You cannot authenticate to my Atlassian site: end with the exact manual
  commands I must run (forge login / register / deploy / install) and what
  I should see on pradeep-de-silva.atlassian.net to confirm success.