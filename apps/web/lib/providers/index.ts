/**
 * Provider factory — picks the implementation based on AI_PROVIDER env.
 *
 *   AI_PROVIDER=mock       → MockProvider (default, no key required)
 *   AI_PROVIDER=anthropic  → AnthropicProvider (requires ANTHROPIC_API_KEY)
 *
 * A single instance is reused per Node process via globalThis to survive Next
 * HMR reloads.
 */
import { MockProvider } from "./mock";
import { AnthropicProvider } from "./anthropic";
import type { LlmProvider } from "./types";

const globalForProvider = globalThis as unknown as { llmProvider?: LlmProvider };

export function getProvider(): LlmProvider {
  if (globalForProvider.llmProvider) return globalForProvider.llmProvider;

  const choice = (process.env.AI_PROVIDER ?? "mock").toLowerCase();
  let provider: LlmProvider;
  switch (choice) {
    case "anthropic":
      provider = new AnthropicProvider();
      break;
    case "mock":
    default:
      provider = new MockProvider();
      break;
  }
  globalForProvider.llmProvider = provider;
  return provider;
}

export type { LlmProvider, LlmCall, LlmTrace } from "./types";
