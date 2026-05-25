/**
 * Anthropic provider — Claude Sonnet
 * ----------------------------------
 * Claude is excellent at writing tasks (summary/bullet rewrites) and reliably
 * follows JSON-output instructions. We use the Messages API in plain text
 * mode and rely on our existing Zod validation + single automatic retry in
 * `ai.ts` to catch the rare drift.
 *
 * The provider only handles transport. Prompt content, validation, and retry
 * policy live in `lib/ai.ts` and `packages/prompts/`.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { LlmCall, LlmProvider } from "./types";

const DEFAULT_MODEL = "claude-sonnet-4-5";
const MAX_TOKENS = 1500;

/**
 * Soft addendum appended to every system prompt to nudge JSON-only output.
 * Our prompt files already say this, but Claude's adherence is even tighter
 * when the constraint appears at the very end of the system message.
 */
const JSON_GUARDRAIL =
  "\n\nCRITICAL OUTPUT FORMAT: Respond with a single JSON object only. " +
  "No markdown, no code fences, no prose before or after the JSON.";

export class AnthropicProvider implements LlmProvider {
  name = "anthropic";
  model: string;
  private client: Anthropic;

  constructor(opts?: { apiKey?: string; model?: string }) {
    const apiKey = opts?.apiKey ?? process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "AnthropicProvider: ANTHROPIC_API_KEY is not set. Either set it in apps/web/.env or switch AI_PROVIDER=mock.",
      );
    }
    this.client = new Anthropic({ apiKey });
    this.model = opts?.model ?? process.env.AI_MODEL ?? DEFAULT_MODEL;
  }

  async run(call: LlmCall) {
    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: MAX_TOKENS,
      system: call.system + JSON_GUARDRAIL,
      messages: [{ role: "user", content: call.user }],
    });

    // Concatenate all text blocks (Claude usually returns exactly one).
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    return {
      rawOutput: text,
      inputTokens: res.usage?.input_tokens,
      outputTokens: res.usage?.output_tokens,
    };
  }
}
