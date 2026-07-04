# CLAUDE.md — standing orders for initiative-sync

Initiative Sync is a Forge app that diffs a Jira hierarchy — rooted at a configurable level:
Initiative, Feature, or Epic (CR-001, ADR-004) — against a matching Confluence page tree, proposes
LLM-assisted content improvements, and syncs only after human review — a diff/merge engine, never
an auto-sync bot. Full design: `docs/design/solution-architecture.md`.

**Read `docs/STATE.md` before doing anything.** It is the single source of truth for what phase
we're in, what works, and what the next steps are.

## Hard rules

1. **Runtime LLM is the Forge LLMs API only**, via the `llm` manifest module. Never add
   `external.fetch` egress permissions or call an outside LLM provider without first writing an ADR
   that the user has approved. See ADR-003.
2. **Never regenerate whole ADF documents.** All Confluence/Jira description writes are surgical
   node-level edits at a recorded locator (page/table/row/cell). Everything outside the target node
   is byte-preserved. See `docs/design/adf-conventions.md` and solution-architecture.md §5.3.

## Tech constraints

- Forge platform limits: resolvers must return within ~25s (thin: validate/enqueue/read-state
  only); real work happens in queue consumers (`timeoutSeconds: 900`).
- TypeScript strict mode everywhere in `src/` (app runtime code).
- `asUser()` for all product (Jira/Confluence) reads and writes; `asApp()` is reserved for internal
  housekeeping only (see ADR-002).
- No hardcoded issue type names, project keys, space keys, custom field IDs, or cloud IDs —
  everything comes from config or is discovered at runtime (portability, solution-architecture §9).
- All project tooling/scripts must be Node `.mjs` invoked via `npm run` — never OS-specific shell
  scripts (`.sh`/`.ps1`/`.bat`). Node version is 22.22.x, enforced by `scripts/check-node.mjs`; do
  not relax the pin without an ADR. See ADR-005.
- Never introduce client API tokens or per-client credentials — see ADR-006.

## Workflow rules

- Small commits, conventional-commit messages (`feat:`, `fix:`, `docs:`, `chore:`, `test:`).
- Update `docs/STATE.md` and the relevant design doc in the **same PR** as any behaviour change.
- Add/extend Vitest tests for all domain logic (diff engine, ADF parsing, validation — pure
  functions, heavily tested).
- Never touch `docs/adr/` without being asked.
- Ask before adding scopes to `manifest.yml`.
- When a change reverses or generalises a design decision, the same PR must sweep the affected doc
  for now-stale statements — flagging is acceptable only for changes that require code to resolve.

## Definition of done for any task

Code + tests green + docs updated + `docs/STATE.md` current.
