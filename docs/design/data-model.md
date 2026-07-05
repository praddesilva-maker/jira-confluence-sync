# Data Model — initiative-sync

Canonical shapes are defined in `docs/design/solution-architecture.md` §4 and implemented in
`src/domain/model.ts`. This doc describes the *as-built* types, the hierarchy-mapping and
pair-coverage rules, and the KVS key layout (`docs/design/solution-architecture.md` §10), kept in
sync with the code in the same PR that changes either.

## Types (as built) — `src/domain/model.ts`

- `ItemType = 'initiative' | 'feature' | 'epic' | 'story' | 'task'` — the five concrete hierarchy
  roles. Story and Task are always siblings at the same depth (both children of Epic); everything
  else is a single-role tier.
- `RootLevel = 'initiative' | 'feature' | 'epic'` — the levels a pair may be rooted at. `epic` is
  the floor (CR-001, ADR-004); Story/Task can never be a root.
- `HierarchyMappingInput = Partial<Record<ItemType, string>>` — the raw, unvalidated candidate
  mapping submitted by the Config screen (each present value is a Jira issue-type **id**).
- `HierarchyMapping` — the validated, site-global mapping: `{ epic, story, task, feature?,
  initiative? }`. `epic`/`story`/`task` are always required (the minimum valid shape); `feature`
  and `initiative` are optional prefix extensions above it.
- `PairConfig = { id, confluencePageUrl, jiraRootKey, rootLevel }`.
- `HierarchyOption = { id, name }` and `HierarchyOptionsByRole = Record<ItemType, HierarchyOption[]>`
  — the site's available issue types per role, as returned by `getHierarchyOptions()`. A role with
  an empty array means that level legitimately doesn't exist on this site's tier — valid data, not
  an error.
- `WorkItem`, `JiraLocator`, `ConfluenceLocator`, `ADFDoc` — defined per solution-architecture.md
  §4, not yet consumed by any Phase 1 code (Phase 2 work).

## Hierarchy mapping: contiguity rule (`src/domain/hierarchy.ts`)

The mapping is **one site-global config**, not one per pair. It must be a contiguous run of roles
from some top role down through the leaf pair (Story, Task — always mapped together, never
independently). Exactly three shapes are valid:

| Shape | Roles mapped | Corresponds to |
|---|---|---|
| Minimum | `epic, story, task` | Sites where only `epic`-root pairs are possible (Standard/Free tiers) |
| Mid | `feature, epic, story, task` | Adds support for `feature`-root pairs |
| Full | `initiative, feature, epic, story, task` | Adds support for `initiative`-root pairs (Premium only) |

Any other combination — a role missing from the middle of the run, or the leaf pair broken apart —
is rejected with a `GAP` error. Two roles mapped to the same issue type are rejected with a
`DUPLICATE_TYPE` error. `validateHierarchyMapping()` is the pure function enforcing this; see its
Vitest suite for the exact edge cases covered.

## Pair coverage rule (`src/domain/hierarchy.ts`)

A pair's `rootLevel` must be **covered** by the current global mapping before the pair can be
saved: `checkPairCoverage(mapping, rootLevel)` checks that `rootLevel`'s role (and everything below
it, which any valid mapping already guarantees) is actually mapped. `epic` is always covered by any
valid mapping; `feature`/`initiative` are only covered if that role was mapped. An attempt to
register a `feature`-root pair under an `epic`-only mapping is rejected with a
`ROOT_LEVEL_NOT_COVERED` error — the friendly message names the missing role.

## Pair validation order (`src/resolvers/config.ts` → `savePair`)

1. **Coverage** — the pair's `rootLevel` is covered by the saved mapping (above).
2. **Confluence URL** — parses to a `pageId` (`src/domain/confluence-url.ts`, supports pretty URLs,
   plain `/pages/<id>`, and both with/without a trailing slash) and the page is confirmed to exist
   via the Confluence v2 API.
3. **Jira root key** — resolves to an issue whose type matches the mapped type for that pair's
   `rootLevel` (not always "initiative" — CR-001).

Each step returns a typed error (`{ code, message }`) rather than throwing; the frontend renders
`error.message` inline.

## KVS key layout (as built)

| Key pattern | Content |
|---|---|
| `config:global` | the validated `HierarchyMapping` (site-wide, not per pair) |
| `config:pair:<id>` | one `PairConfig` (`id` is a `randomUUID()`) |

`job:*`, `report:*`, `plan:*`, `audit:*` keys are not yet written — Phase 2+ work.
