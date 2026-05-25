/**
 * LLM provider interface
 * ----------------------
 * Every provider implements the same shape so `ai.ts` doesn't care which one
 * is configured. The contract is intentionally minimal: take an LlmCall,
 * return the raw text the model produced (which must be JSON for our use).
 *
 * Validation and retry policy live one level up in `ai.ts` so they apply
 * uniformly to every provider.
 */

export interface LlmCall {
  promptName: string;
  promptVersion: number;
  system: string;
  user: string;
}

export interface LlmTrace extends LlmCall {
  /** Raw text returned by the model — should be JSON for our prompts. */
  rawOutput: string;
  /** Total wall-clock latency for the call, in ms. */
  ms: number;
  /** True when the deterministic mock answered instead of a real provider. */
  mocked: boolean;
  /** Identifier of the model that answered (e.g. "claude-sonnet-4-5"). */
  model: string;
  /** Tokens, when reported by the provider. */
  inputTokens?: number;
  outputTokens?: number;
}

export interface LlmProvider {
  name: string;
  model: string;
  /**
   * Run the prompt and return the raw model output. Implementations should
   * be ROBUST to providers that wrap JSON in markdown fences — the consumer's
   * validator (`validateLlmJson`) already strips them, but providers can
   * help by requesting JSON mode where available.
   */
  run(call: LlmCall): Promise<{
    rawOutput: string;
    inputTokens?: number;
    outputTokens?: number;
  }>;
}
