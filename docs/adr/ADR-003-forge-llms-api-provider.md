# ADR-003: Forge LLMs API as primary LLM provider

**Status:** Accepted
**Date:** 2026-07-04

## Context

The enrich pipeline (solution-architecture.md §6, §8) needs an LLM to suggest content
improvements. Real alternatives considered (§8, §13 Q4):

1. **Forge LLMs API** (Preview) — call Atlassian-hosted Claude models directly from Forge via the
   `llm` manifest module. Requests never leave Atlassian infrastructure.
2. **Direct Anthropic API** (Messages API) — full model/parameter control, but requires declaring
   `external.fetch` egress and storing a provider API key as a KVS secret.
3. **Copilot / Rovo seats** — ruled out entirely: Copilot has no API a Forge backend can call (it
   only reaches Jira as a remote chat agent via the Rovo Agent Connector), and Rovo agents are a
   chat/conversational surface, not a batch-callable inference API suitable for the enrich
   pipeline's per-item/per-batch calls.

## Decision

**Forge LLMs API is the primary provider**, behind an `LLMProvider` interface
(solution-architecture.md §8):

```ts
interface LLMProvider {
  suggestImprovements(input: {
    item: WorkItem; siblings: Summary[]; parentChain: Summary[];
  }): Promise<FieldSuggestions>;
}
```

`NullProvider` (drift-only, always available, no LLM call) is the guaranteed fallback. A direct
`AnthropicProvider` remains an optional escape hatch behind the same interface, for clients who
explicitly accept declared egress — not enabled by default.

## Consequences

- **Zero egress declaration** for the default configuration — the app keeps the **Runs on
  Atlassian** badge, the strongest portability/trust posture for security-conscious clients.
- Enabled via the `llm` manifest module — adding this module is a major version bump on whichever
  phase introduces it (Phase 4), not Phase 0.
- Requests pass through Atlassian's standard AI moderation; token usage is reported per call.
- **Cost sits with the app developer** under Forge's consumption-based LLM pricing (free monthly
  allowance at personal/demo scale) rather than with each client — a line to revisit if this
  productises beyond personal use.
- **Risk:** Preview status means a shorter deprecation window than GA APIs. The `LLMProvider`
  interface is the hedge — swapping providers means writing a new class, not restructuring the
  enrich pipeline.
- Per `CLAUDE.md` hard rule: no `external.fetch` egress may be added without a new ADR explicitly
  approving it.
