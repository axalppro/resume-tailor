# /new-provider

Scaffold a new AI provider for the tailoring pipeline.

## Steps

1. Create `apps/web/lib/providers/<name>.ts` — implement `LlmProvider` from `./types`:
   - Export a default class/object with `name`, `model`, and `run(call: LlmCall)` method
   - Strip markdown code fences from model output before returning (see `openai-compatible.ts` for pattern)
   - Read credentials from `process.env` and throw a clear error if missing

2. Register in `apps/web/lib/providers/index.ts` — add a case to the provider switch for `AI_PROVIDER === "<name>"`

3. Add the required env var(s) to:
   - `apps/web/.env.example` (with a placeholder value)
   - The env var reference table in `CLAUDE.md`

4. Run `/check` to confirm no type errors.

## Reference
- Provider interface: `apps/web/lib/providers/types.ts`
- Existing example: `apps/web/lib/providers/anthropic.ts`
- Orchestrator / retry logic: `apps/web/lib/ai.ts`
