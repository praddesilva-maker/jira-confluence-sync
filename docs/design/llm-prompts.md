# LLM Prompts — initiative-sync

Skeleton. Populated in Phase 4 (LLM enrichment).

Will hold the actual, versioned prompts sent to the LLM via the `LLMProvider` interface
(solution-architecture.md §8): the `suggestImprovements` prompt, including how parent-chain and
sibling context is assembled, the structured-JSON output contract, and prompt version history
(one dated entry per change, since prompt changes affect suggestion quality/cost and should be
reviewable like code).

No prompts yet — Phase 0 has no `llm` manifest module and no LLM calls.
