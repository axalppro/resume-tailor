/**
 * Ollama provider — local, self-hosted model in Docker.
 *
 * Reaches the Ollama daemon's OpenAI-compatible endpoint at
 * `${OLLAMA_URL}/v1/chat/completions`. Default model `qwen2.5:7b-instruct`,
 * chosen for strong JSON-following at a manageable ~5 GB memory footprint.
 *
 * No API key. No signup. Privacy is total — prompt and resume never leave
 * the host machine. This is the default for shared / multi-user builds.
 */
import { openAICompatibleChat } from "./openai-compatible";
import type { LlmCall, LlmProvider } from "./types";

const DEFAULT_URL = "http://localhost:11434";
const DEFAULT_MODEL = "qwen2.5:7b-instruct";

const JSON_GUARDRAIL =
  "\n\nCRITICAL OUTPUT FORMAT: Respond with a single JSON object only. " +
  "No markdown, no code fences, no prose before or after the JSON.";

export class OllamaProvider implements LlmProvider {
  name = "ollama";
  model: string;
  private baseUrl: string;

  constructor(opts?: { baseUrl?: string; model?: string }) {
    // Ollama exposes the OpenAI-compatible API under /v1, but its native
    // `/api/chat` lives at the root. Both go through the same daemon; we
    // standardise on /v1 because it accepts `response_format`.
    const root = opts?.baseUrl ?? process.env.OLLAMA_URL ?? DEFAULT_URL;
    this.baseUrl = `${root.replace(/\/$/, "")}/v1`;
    this.model = opts?.model ?? process.env.OLLAMA_MODEL ?? DEFAULT_MODEL;
  }

  async run(call: LlmCall) {
    return openAICompatibleChat({
      baseUrl: this.baseUrl,
      model: this.model,
      system: call.system + JSON_GUARDRAIL,
      user: call.user,
      jsonMode: true,
      // Ollama on CPU can be slow on the very first request after pulling a
      // model (cold-load weights). Generous timeout so it doesn't surface as
      // a flaky error on first use.
      timeoutMs: 180_000,
    });
  }
}
