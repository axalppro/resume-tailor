/**
 * Perplexity provider — Perplexity API (sonar family).
 *
 * Uses the OpenAI-compatible chat-completions endpoint at
 * `https://api.perplexity.ai/chat/completions`. Default model `sonar`
 * (fast, cheap, plenty for structured JSON tasks). Other sonar SKUs
 * (`sonar-pro`, `sonar-reasoning`) are selectable via PERPLEXITY_MODEL.
 *
 * Cost: pay-per-token via the API key (separate from Perplexity Pro UI).
 */
import { openAICompatibleChat } from "./openai-compatible";
import type { LlmCall, LlmProvider } from "./types";

const BASE_URL = "https://api.perplexity.ai";
const DEFAULT_MODEL = "sonar";

const JSON_GUARDRAIL =
  "\n\nCRITICAL OUTPUT FORMAT: Respond with a single JSON object only. " +
  "No markdown, no code fences, no prose before or after the JSON.";

export class PerplexityProvider implements LlmProvider {
  name = "perplexity";
  model: string;
  private apiKey: string;

  constructor(opts?: { apiKey?: string; model?: string }) {
    const apiKey = opts?.apiKey ?? process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      throw new Error(
        "PerplexityProvider: PERPLEXITY_API_KEY is not set. Either set it in apps/web/.env or pick another AI_PROVIDER.",
      );
    }
    this.apiKey = apiKey;
    this.model = opts?.model ?? process.env.PERPLEXITY_MODEL ?? DEFAULT_MODEL;
  }

  async run(call: LlmCall) {
    return openAICompatibleChat({
      baseUrl: BASE_URL,
      apiKey: this.apiKey,
      model: this.model,
      system: call.system + JSON_GUARDRAIL,
      user: call.user,
      // NOTE: Perplexity does NOT accept OpenAI's `{ type: "json_object" }`
      // shape — their API only allows `text`, `json_schema` (which requires
      // a full schema), or `regex`. Sending json_object yields 400 before
      // generation starts. We rely on the JSON_GUARDRAIL system prompt plus
      // the existing Zod-validated retry in ai.ts, which already strips
      // code fences and re-prompts on validation failure.
      jsonMode: false,
    });
  }
}
