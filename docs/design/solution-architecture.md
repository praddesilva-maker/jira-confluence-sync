# Solution Architecture — "Initiative Sync" Forge App

**Working name:** `initiative-sync` (rename freely)
**Status:** v0.3 — design questions Q1–Q7 resolved 2026-07-04 (see §13); Q1 reversed by CR-001 /
ADR-004, 2026-07-04 (configurable hierarchy root)
**Owner:** Prad de Silva
**Target platform:** Atlassian Cloud (Jira + Confluence), Forge, Node 22, Custom UI (React)

---

## 1. Purpose

A Forge app that treats a Jira Initiative hierarchy (Initiative → Feature → Epic → Story/Task) and a
Confluence page tree (Initiative root page → one child page per Feature, containing Epic and
Story/Task tables) as two representations of the same plan, detects drift between them, uses an LLM
to propose content improvements, and — after human review — synchronises in the direction the user
selects per item.

Core design stance: **the app is a diff/merge engine with a human-in-the-loop gate, not an
auto-sync bot.** Nothing writes to Jira or Confluence without an explicit user-approved plan.

---

## 2. Architecture on a page

```
┌─────────────────────────────  Forge App  ─────────────────────────────┐
│                                                                       │
│  Custom UI (React, jira:globalPage)                                   │
│  ┌──────────┐ ┌───────────────┐ ┌──────────────────────────────────┐  │
│  │ Config   │ │ Compare runner│ │ HIL Review Board                 │  │
│  │ screen   │ │ (job status)  │ │ drift cards · direction picker   │  │
│  │          │ │               │ │ LLM suggestion accept/edit/reject│  │
│  └────┬─────┘ └──────┬────────┘ └──────────────┬───────────────────┘  │
│       │              │ invoke resolvers        │                      │
│  ─────┴──────────────┴──────────────────────────┴──────────────────   │
│  Resolvers (25s limit — thin: validate, enqueue, read state)          │
│       │                                                               │
│  Async event queues (long-running consumers, timeoutSeconds: 900)     │
│  ┌────────────────┐   ┌────────────────┐   ┌────────────────┐         │
│  │ compare-worker │   │ enrich-worker  │   │ sync-worker    │         │
│  │ extract+diff   │   │ LLM suggestions│   │ execute plan   │         │
│  └───────┬────────┘   └───────┬────────┘   └───────┬────────┘         │
│          │                    │                    │                  │
│  Forge KVS (config, job state, snapshots, plans, audit log)           │
│          │                    │                    │                  │
└──────────┼────────────────────┼────────────────────┼──────────────────┘
           │ requestJira /      │ Forge LLMs API     │ requestJira /
           │ requestConfluence  ▼ (on-platform)      │ requestConfluence
           ▼              Claude via Forge           ▼
     Jira Cloud API      (zero egress, RoA     Confluence Cloud API v2
     (asUser)             badge preserved)      (asUser, ADF bodies)
```

## 3. Forge modules & manifest shape

| Module | Purpose |
|---|---|
| `jira:globalPage` (Custom UI) | Single app surface: config, compare, review, sync. Chosen over a Confluence macro for MVP so the app works even before a Confluence page exists. A `confluence:contentAction` ("Compare with Jira") can be added later as a convenience entry point. |
| `function` + `resolver` | Thin resolvers only: save config, enqueue jobs, read job state/results. Nothing heavy — 25s ceiling. |
| `consumer` × 3 | `compare-queue`, `enrich-queue`, `sync-queue`, each backed by a long-running function (`timeoutSeconds: 900`). |
| `storage:app` scope + KVS | Config, snapshots, drift reports, sync plans, audit entries. |

**Scopes (minimum viable):**
`read:jira-work`, `write:jira-work`, `read:page:confluence` (v2), `write:page:confluence`,
`read:confluence-content.all` (if needed for search-by-title), `storage:app`, plus the `llm`
manifest module for the Forge LLMs API (see §8). **No external egress declared** — the app stays
eligible for the Runs on Atlassian badge.

**API identity:** default `asUser()` for all Jira/Confluence reads and writes. This gives permission
fidelity (user can't sync what they can't edit), a clean audit trail in both products, and is the
portable choice across clients. `asApp()` is reserved for internal housekeeping only.

## 4. Domain model (the canonical layer)

Everything is normalised into one shape before comparison. This is the single most important
abstraction — Jira and Confluence are just adapters.

```ts
type ItemType = 'initiative' | 'feature' | 'epic' | 'story' | 'task';

interface WorkItem {
  itemType: ItemType;
  jiraKey: string | null;          // null = new item (Confluence side only)
  summary: string;
  description: {
    adf: ADFDoc;                   // preserved verbatim for writes
    text: string;                  // normalised plain text for diffing/LLM
  };
  parentKey: string | null;        // Jira key of parent
  origin: JiraLocator | ConfluenceLocator;
}

interface JiraLocator      { source: 'jira'; issueId: string; }
interface ConfluenceLocator{ source: 'confluence'; pageId: string; pageVersion: number;
                             tableIndex?: number; rowIndex?: number; } // undefined for page-level items
```

**Drift statuses** produced by the diff engine:

| Status | Meaning | Default direction |
|---|---|---|
| `IN_SYNC` | Key matched, all fields equal after normalisation | — |
| `FIELD_DRIFT` | Key matched, summary and/or description differ (field-level detail retained) | user chooses |
| `MOVED` | Key matched, parentKey differs | user chooses |
| `NEW_IN_JIRA` | Key exists in Jira, absent from Confluence | auto: Jira → Confluence |
| `NEW_IN_CONFLUENCE` | Row with null/blank Jira Key | auto: Confluence → Jira (creates issue, writes key back into the table row) |
| `MISSING_IN_JIRA` | Row has a Jira Key that doesn't resolve | flagged as conflict — never auto-delete |
| `KEY_CONFLICT` | Same key appears in two rows, or key's Jira issue type mismatches table context | blocked until user fixes |
| `OUT_OF_SCOPE` | Parent Key references an item outside the configured pair's subtree (only possible when `rootLevel` is below the top of the site's hierarchy — CR-001, ADR-004) | flagged for manual handling — never synced |

**Deletion policy:** the app never deletes issues or rows. Disappearance on one side surfaces as
`NEW_IN_*` / `MISSING_IN_JIRA` and the user decides. (Safe default for portability across clients.)

## 5. Adapters

### 5.1 Jira adapter (read)
1. Fetch the Initiative issue by key; validate its issue type maps to the "initiative" level (see §9 portability).
2. Traverse children breadth-first with JQL `parent = <KEY>` per level (paginated, `/rest/api/3/search/jql`).
3. Pull `summary`, `description` (ADF), `issuetype`, `parent` per issue.
4. Emit `WorkItem[]` + a tree index.

### 5.2 Confluence adapter (read)

The page model depends on the pair's configured `rootLevel` (CR-001, ADR-004) — Premium's extra
hierarchy levels only exist above Epic, so a lower root collapses the page tree accordingly:

- **`rootLevel: initiative`** (original design, unchanged): root page + one child page per Feature.
  Root page carries Initiative Summary/Description; each Feature child page carries its own
  Summary/Description plus an Epics table and a Stories/Tasks table.
- **`rootLevel: feature`**: a single page — Feature Summary/Description sections, an Epics table,
  and a Stories/Tasks table. No child pages; the Feature *is* the root.
- **`rootLevel: epic`** (minimum — available on all Jira tiers, incl. Standard/Free): a single page
  — Epic Summary/Description sections and a Stories/Tasks table only (no Epics table, since Epic is
  already the root).

Read steps, generalised over root level:

1. Resolve page ID from the configured URL; fetch via v2 API with `body-format=atlas_doc_format`.
2. Root page: extract Summary and Description sections. **Convention required** — recommend
   two `h2` headings (`Summary`, `Description`) whose following sibling nodes up to the next heading
   are the content. The app ships a "Create/repair page scaffold" action so the convention is
   self-installing rather than tribal knowledge.
3. If `rootLevel: initiative`, enumerate child pages (v2 children endpoint); each child is one
   Feature page, using the same heading convention plus Epics/Stories-Tasks tables. If `rootLevel`
   is `feature` or `epic`, there are no child pages — the tables live directly on the root page.
   Table header rows: `Jira Key | Summary | Description | Parent Key` — plus `Type` for the
   story/task table (see Q3) — with the Epics table present only when `rootLevel: initiative` or
   `feature`.
4. Parse ADF `table` nodes → rows → `WorkItem[]`, keeping `(pageId, pageVersion, tableIndex, rowIndex)`
   locators and the raw ADF of each cell.

### 5.3 Write-back rules (both directions)
- **Never regenerate whole documents.** Writes are surgical ADF node replacements at the recorded
  locator; everything outside the target cell/section is byte-preserved.
- **Optimistic concurrency:** page version captured at compare time is re-checked at sync time.
  Version moved → that page's items are marked `STALE` and excluded; user re-runs compare for them.
- Jira writes: `PUT /rest/api/3/issue/{key}` for summary/description/parent; `POST` to create
  `NEW_IN_CONFLUENCE` items, then write the new key into the Confluence row (a two-sided write that
  is sequenced create-first, and the row update is retried via the queue on failure).
- ADF fidelity note: Jira and Confluence ADF are near-identical but not identical (some macros/media
  don't cross). The sync copies ADF as-is and validates against a supported-node allowlist;
  unsupported nodes flag the item as `MANUAL_REVIEW` instead of silently mangling content.

## 6. The compare pipeline (async job)

```
User clicks Compare
 → resolver validates config, creates job record {jobId, status: QUEUED}, pushes to compare-queue
 → compare-worker (≤900s):
     1. Jira extract  → snapshot J
     2. Confluence extract → snapshot C  (page versions recorded;
        fan-out: one queue event per Feature page for the 100–1,000 item envelope)
     3. Diff(J, C) → DriftReport (item-level, field-level)
     4. Persist snapshots + report to KVS (chunked if large)
     5. Push one enrich event per drifted item (or small batches) to enrich-queue
 → enrich-worker: LLM call per item/batch → suggestion records appended to report
 → UI polls job status resolver; renders review board progressively
   (drift is usable immediately; LLM suggestions stream in as they land)
```

Fan-out per item on the enrich step keeps each LLM invocation short, gives free retry/backoff via
the Async Events API, and means a slow or down LLM never blocks drift review.

## 7. HIL review board (Custom UI)

- Tree-grouped drift cards: Initiative → Feature → Epic → Story/Task.
- Per card: side-by-side Jira vs Confluence values, changed fields highlighted, drift status badge.
- Direction control: `Jira → Confluence` / `Confluence → Jira` / `Skip` (defaults per §4 table).
- LLM suggestion panel per field: original vs suggested, **Accept / Edit / Reject**. Accepted or
  edited text becomes the payload for whichever direction is chosen; "improve both sides" is simply
  choosing a suggestion and setting direction accordingly per field.
- "Sync" builds an immutable `SyncPlan` (item, direction, final field values, target locators,
  expected page versions), stores it, and enqueues it. Sync-worker executes with per-item results;
  UI shows a completion report; audit entry written per mutation
  (`who, when, item, direction, before-hash, after-hash`).

## 8. LLM layer

```ts
interface LLMProvider {
  suggestImprovements(input: {
    item: WorkItem; siblings: Summary[]; parentChain: Summary[];
  }): Promise<FieldSuggestions>;
}
```

- **Primary provider — `ForgeLLMProvider` (DECIDED, Q4):** the Forge LLMs API (Preview) lets the
  app call Atlassian-hosted Claude models natively from Forge. Requests never leave Atlassian
  infrastructure, so no egress declaration is needed and the app remains eligible for the
  **Runs on Atlassian** badge — the strongest possible portability posture for security-conscious
  clients. Enabled via the `llm` manifest module (once per app; adding it is a major version bump).
  Requests pass through Atlassian's standard AI moderation, and token usage is reported per call.
- **Cost note:** Forge LLM usage is billed to the app developer (you) in credits under Forge's
  consumption pricing, with a free monthly allowance per app — negligible at personal/demo scale;
  a cost line to model if this productises.
- **Risk note:** Preview status = stable and production-permitted, but shorter deprecation windows.
  The `LLMProvider` interface is the hedge: `NullProvider` (drift-only, always available) is the
  guaranteed fallback, and a direct `AnthropicProvider` (Messages API + declared egress + KVS-secret
  key) remains an optional escape hatch behind the same interface — only for clients who accept
  egress.
- Copilot / Rovo seats are **not** runtime options: Copilot has no API a Forge backend can consume
  (it connects to Jira only as a remote chat agent via the Rovo Agent Connector), and Rovo agents
  are a chat/agent interaction surface, not a batch-callable inference API for the enrich pipeline.
  A `rovo:agent` module may be added later as a *conversational front door* to this app ("what's
  drifted on Initiative X?"), not as its inference engine.
- Prompting: structured JSON out; context includes the parent chain and sibling summaries so
  suggestions can do the cohesion/conflicting-intent work you specified (child clarifies parent
  intent and vice versa). Suggestions are **text-only**; formatting is never altered by the LLM —
  suggested text is re-wrapped into the original ADF paragraph structure on write. Prompts are
  versioned in `docs/design/llm-prompts.md`.

## 9. Portability by design

This is where most Forge apps quietly become single-tenant. Hard rules:

1. **No hardcoded issue type names or IDs.** "Initiative" and "Feature" are Premium custom
   hierarchy levels whose names differ per site. Config step includes a **hierarchy mapping**
   screen: the app reads the site's issue types + hierarchy levels and the user maps each role to a
   concrete issue type. Since CR-001/ADR-004, mapping is **conditional on the pair's `rootLevel`**:
   only roles at or below the chosen root need mapping (an `epic`-root pair maps just `epic`,
   `story`, `task`; a `feature`-root pair adds `feature`; only an `initiative`-root pair needs all
   four, and Premium is required only in that case). Stored per installation.
2. **No hardcoded project keys, space keys, custom field IDs, or cloud IDs.** Everything from
   config or discovered at runtime.
3. `asUser()` everywhere user-facing → the app inherits each client's permission scheme instead of
   fighting it.
4. Page-structure conventions are enforced/created by the app's scaffold action, not assumed.
5. Distribution: Forge environments (dev/staging/prod) + installation link per client site;
   Marketplace private listing is the later step. One codebase, config-per-installation.
6. Multi-initiative from day one: config is a list of pairs, not a single pair. Since
   CR-001/ADR-004 each pair is `{confluencePageUrl, jiraRootKey, rootLevel}`, where `rootLevel` is
   one of `initiative | feature | epic` (`epic` is the minimum, available on all Jira tiers) and
   `jiraRootKey` is the Jira key of whichever issue sits at the pair's configured root — not
   necessarily an Initiative. Pair validation checks that `jiraRootKey` resolves to an issue whose
   type matches the mapped issue type for that pair's `rootLevel`.

## 10. Storage layout (Forge KVS)

| Key pattern | Content |
|---|---|
| `config:global` | hierarchy mapping, LLM provider choice |
| `config:pair:<id>` | pair config: page URL/ID, `jiraRootKey`, `rootLevel` (CR-001/ADR-004) |
| `job:<jobId>` | job status machine: QUEUED → EXTRACTING → DIFFING → ENRICHING → READY → SYNCING → DONE/FAILED |
| `report:<jobId>:<chunk>` | drift report, chunked to respect KVS value-size limits |
| `plan:<planId>` | immutable sync plan |
| `audit:<ts>:<id>` | one entry per mutation |
| secret: `llm:apikey` | provider API key (KVS secret) |

## 11. Failure & safety model

- Queues give at-least-once delivery → **all workers idempotent** (sync-worker checks audit log +
  target state hash before writing).
- Per-item sync isolation: one failed item never rolls back or blocks others; failures land in the
  completion report with retry.
- Rate limits (Jira/Confluence REST + LLM): exponential backoff with jitter via `InvocationError`
  retry pattern.
- Compare is read-only by construction — safe to run any time.

## 12. Tech stack summary

| Concern | Choice |
|---|---|
| Runtime | Forge, current Node runtime (pin local dev to your working Node 22 via `.nvmrc`) |
| Frontend | Custom UI: React 18 + Vite, `@forge/bridge`; Atlaskit components for native look |
| Backend | `@forge/resolver`, `@forge/events`, `@forge/kvs`, `@forge/api` |
| Language | TypeScript end-to-end, strict mode |
| Testing | Vitest for domain layer (diff engine, ADF parsing — pure functions, heavily tested); manual + `forge tunnel` for integration |
| CI | GitHub Actions: lint, typecheck, unit tests on PR; `forge deploy -e staging` on main (deploy token as GH secret) |
| Source | GitHub, trunk-based with short-lived branches, conventional commits |

## 13. Resolved design decisions (2026-07-04)

| # | Decision | Design impact |
|---|---|---|
| Q1 | **Reversed by CR-001, ADR-004.** Hierarchy root is **configurable per pair**: `rootLevel` is one of `initiative \| feature \| epic`, chosen by the user per initiative pair. `epic` is the minimum and works on every Jira tier (Free/Standard/Premium); `initiative`/`feature` roots still require Premium's extra hierarchy levels. No hard Premium prerequisite anymore. | Hierarchy mapping (Phase 1) becomes conditional on `rootLevel` — only maps roles at/below the chosen root; validates the site exposes the levels the chosen root needs and errors clearly if not. Confluence page model varies by root (§5.2). Enables end-to-end testing on a free/personal-tier site. |
| Q2 | **Option (a).** Synced descriptions restricted to a supported ADF node allowlist (paragraph, text + marks, lists, code, simple links). Richer nodes (panels, media, expands, macros) flag the item `MANUAL_REVIEW` — never silently mangled. | Allowlist lives in `docs/design/adf-conventions.md`; validator in the domain layer. |
| Q3 | **`Type` column added** to the Stories/Tasks table (`Story` \| `Task`, mapped via hierarchy config). Required for new rows; validated against the mapped issue types. | Table convention + scaffold action updated; `KEY_CONFLICT` raised if Type contradicts an existing key's issue type. |
| Q4 | **Forge LLMs API is the primary provider** (§8). Zero egress, Runs on Atlassian preserved, Atlassian-hosted Claude. Copilot/Rovo seats ruled out as runtime engines; `NullProvider` fallback retained; direct Anthropic API optional escape hatch. | `llm` manifest module; no `external.fetch` permissions; LLM cost sits with the developer under Forge consumption pricing. |
| Q5 | **Moves are fully in scope, including page management.** A `MOVED` Epic sync relocates the Epic row *and all descendant Story/Task rows* to the target Feature's page; if the target Feature has no page yet, the sync-worker **creates the Feature page** under the Initiative root using the standard scaffold. **Applies only when `rootLevel: initiative`** (CR-001, ADR-004) — `feature`- and `epic`-root pairs have no Feature-page tier to relocate rows across or create pages under; a `MOVED` row there is just an in-page table edit. | Sync-worker gains `createFeaturePage` + `relocateRows` operations; both audited; multi-page writes sequenced with per-page version checks (partial completion is reported, never silent). |
| Q6 | **Scale envelope: 100–1,000 items per initiative.** | Extraction fans out per Feature page (one queue event per page) rather than one monolithic pass; drift reports chunked in KVS; enrichment batched (~10 items/LLM call) to bound cost and latency at the top of the range. |
| Q7 | **No page locking.** Optimistic concurrency only: page versions captured at compare, re-checked at sync; moved versions mark items `STALE` and exclude them from the plan. | Confirmed as designed (§5.3, §11). |

## 14. Phase plan (maps to documentation strategy + prompts)

| Phase | Deliverable | Proves |
|---|---|---|
| 0 | Repo + docs skeleton + Forge scaffold deployed, hello-world global page | Toolchain works end-to-end |
| 1 | Config: pair management, hierarchy mapping, KVS persistence, URL/key validation | Forge storage + product API reads |
| 2 | Read-only extraction: Jira tree + Confluence ADF parse → canonical model, rendered as a tree in UI | The two adapters + domain model |
| 3 | Diff engine + drift report UI (no LLM, no writes) — **first genuinely useful release** | Core value prop |
| 4 | LLM enrichment: provider abstraction, Anthropic + Null providers, suggestion UX | Agentic layer |
| 5 | Sync execution: plan builder, sync-worker, write-backs, audit, completion report | The scary part, last, smallest blast radius |
| 6 | Hardening & portability: scaffold action, error UX, multi-site install runbook, demo data | Client-ready |

Each phase ends installed on your `pradeep-de-silva.atlassian.net` site and demoed against a copy of
your ADT project — your existing Jira instance is the perfect test bed.