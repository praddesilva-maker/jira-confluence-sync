# ADF Conventions — initiative-sync

Skeleton. Populated in Phase 2 (read/parse conventions) and Phase 3+ (write-back rules).

Will document, with exact ADF JSON shapes:

- The Confluence page scaffold convention for all three root levels (CR-001, ADR-004): root page +
  one child page per Feature when `rootLevel: initiative`; a single page when `rootLevel: feature`
  or `epic`. `Summary` / `Description` `h2` sections in every variant — solution-architecture.md
  §5.2.
- The Epics table and Stories/Tasks table header rows, including the `Type` column
  (solution-architecture.md §5.2, Q3).
- The supported ADF node allowlist for synced description content (paragraph, text + marks, lists,
  code, simple links) and the `MANUAL_REVIEW` escape hatch for unsupported nodes (Q2).
- The surgical-edit rule: writes are node replacements at a recorded locator; nothing outside the
  target node is touched (solution-architecture.md §5.3). This is a hard rule — see `CLAUDE.md`.

No content yet — Phase 0 makes no Confluence API calls.
