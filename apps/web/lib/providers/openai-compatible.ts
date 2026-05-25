/**
 * Shared transport for OpenAI-compatible chat-completions APIs.
 *
 * Both Ollama (`/v1/chat/completions`) and Perplexity (`/chat/completions`)
 * speak the same wire format, so we keep a single fetch implementation here
 * and let each provider wrap it with its own defaults (URL, model, headers).
 *
 * Why hand-rolled and not `openai` SDK: avoids a heavyweight dependency for
 * what is, in practice, one POST per call. Keeps the Docker image lean.
 */

export interface OpenAIChatRequest {
  baseUrl: string;
  apiKey?: string;
  model: string;
  system: string;
  user: string;
  /** Hint for stricter JSON output. Ignored by servers that don't support it. */
  jsonMode?: boolean;
  /** Soft upper bound; defaults to 1500 to match the Anthropic provider. */
  maxTokens?: number;
  /** Override fetch (handy in tests). */
  fetchImpl?: typeof fetch;
  /** Abort timeout in ms. Default 90s — Ollama on CPU can be slow on first run. */
  timeoutMs?: number;
}

export interface OpenAIChatResponse {
  rawOutput: string;
  inputTokens?: number;
  outputTokens?: number;
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export async function openAICompatibleChat(
  req: OpenAIChatRequest,
): Promise<OpenAIChatResponse> {
  const f = req.fetchImpl ?? fetch;
  const url = `${req.baseUrl.replace(/\/$/, "")}/chat/completions`;

  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (req.apiKey) headers["authorization"] = `Bearer ${req.apiKey}`;

  const body: Record<string, unknown> = {
    model: req.model,
    max_tokens: req.maxTokens ?? 1500,
    messages: [
      { role: "system", content: req.system },
      { role: "user", content: req.user },
    ],
  };
  if (req.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  // AbortController so a hung Ollama doesn't deadlock the route.
  const ctl = new AbortController();
  const timeout = setTimeout(() => ctl.abort(), req.timeoutMs ?? 90_000);

  let res: Response;
  try {
    res = await f(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `OpenAI-compatible call to ${url} failed (${res.status}): ${detail.slice(0, 500)}`,
    );
  }

  const json = (await res.json()) as ChatCompletionResponse;
  const text = json.choices?.[0]?.message?.content ?? "";

  return {
    rawOutput: text,
    inputTokens: json.usage?.prompt_tokens,
    outputTokens: json.usage?.completion_tokens,
  };
}
