/**
 * Generic LLM-output validation helper.
 *
 * Pipeline:
 *   1. LLM returns a string that should be JSON
 *   2. We attempt JSON.parse + Zod schema.parse
 *   3. On failure, we surface a typed error the route handler can act on
 *      (e.g. retry with a "fix the JSON" prompt — implemented in Phase 2).
 */
import type { ZodSchema, ZodError } from "zod";

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; zodError?: ZodError; raw: unknown };

export function tryParseJson(raw: string): unknown | undefined {
  try {
    return JSON.parse(raw);
  } catch {
    // Some models wrap output in ```json fences; strip them.
    const stripped = raw.replace(/^```(?:json)?/i, "").replace(/```$/g, "").trim();
    try {
      return JSON.parse(stripped);
    } catch {
      return undefined;
    }
  }
}

export function validateLlmJson<T>(schema: ZodSchema<T>, raw: string): ValidationResult<T> {
  const parsed = tryParseJson(raw);
  if (parsed === undefined) {
    return { ok: false, error: "LLM output was not valid JSON", raw };
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      error: "LLM JSON failed schema validation",
      zodError: result.error,
      raw: parsed,
    };
  }
  return { ok: true, data: result.data };
}
