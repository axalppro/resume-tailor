/**
 * ai.ts — AI pipeline orchestrator
 * --------------------------------
 * Implements the six-step pipeline from the project brief:
 *
 *   1. Input collection
 *   2. Structured extraction (parseJob)
 *   3. Recommendation (recommendBlocks — deterministic, no LLM)
 *   4. Controlled rewrite (tailorSummary, rewriteBullets)
 *   5. Human approval — happens in the UI
 *   6. Rendering — lib/typst.ts + the compiler microservice
 *
 * Phase 2: the provider is selected at runtime via `AI_PROVIDER`:
 *
 *   AI_PROVIDER=mock       (default; offline, deterministic, no key)
 *   AI_PROVIDER=anthropic  (Claude Sonnet via @anthropic-ai/sdk)
 *
 * Validation policy: every LLM response is parsed against its Zod schema.
 * On failure we retry ONCE with a "fix the JSON" addendum; if the retry also
 * fails the error surfaces to the route handler.
 */

import {
  JobSignalsSchema,
  type JobSignals,
  type MasterResume,
  type TailorRequest,
  type TailorResponse,
  type ContentBlock,
  type BlockRecommendation,
  TailorResponseSchema,
} from "@resume-tailor/shared-types";
import {
  PARSE_JOB_SYSTEM,
  PARSE_JOB_USER,
  PARSE_JOB_VERSION,
  TAILOR_SUMMARY_SYSTEM,
  TAILOR_SUMMARY_USER,
  TAILOR_SUMMARY_VERSION,
  REWRITE_BULLETS_SYSTEM,
  REWRITE_BULLETS_USER,
  REWRITE_BULLETS_VERSION,
} from "@resume-tailor/prompts";
import { z, type ZodSchema } from "zod";
import { validateLlmJson } from "./validation";
import { scoreBlock, explainScore } from "./scoring";
import { getProvider } from "./providers";
import type { LlmCall, LlmTrace } from "./providers";

export type { LlmCall, LlmTrace };

// =============================================================================
// Core: run a prompt and validate the JSON it returns.
// =============================================================================

/**
 * Run an LlmCall and validate its JSON output against `schema`. If validation
 * fails, retry once with an explicit "fix the JSON" addendum appended to the
 * user message. After two attempts, throw.
 */
async function runValidated<T>(
  call: LlmCall,
  schema: ZodSchema<T>,
): Promise<{ data: T; trace: LlmTrace }> {
  const provider = getProvider();
  const isMock = provider.name === "mock";

  // Attempt 1
  const start = Date.now();
  const first = await provider.run(call);
  let trace: LlmTrace = {
    ...call,
    rawOutput: first.rawOutput,
    ms: Date.now() - start,
    mocked: isMock,
    model: provider.model,
    inputTokens: first.inputTokens,
    outputTokens: first.outputTokens,
  };
  const v1 = validateLlmJson(schema, first.rawOutput);
  if (v1.ok) return { data: v1.data, trace };

  // Attempt 2 — give the model the previous output + an explicit fix request.
  const fixCall: LlmCall = {
    ...call,
    user:
      call.user +
      `\n\nYour previous response did not match the required JSON schema.\n` +
      `Validation error: ${v1.error}\n` +
      `Return ONLY the corrected JSON object — no prose, no markdown.`,
  };
  const retryStart = Date.now();
  const second = await provider.run(fixCall);
  trace = {
    ...fixCall,
    rawOutput: second.rawOutput,
    ms: Date.now() - retryStart,
    mocked: isMock,
    model: provider.model,
    inputTokens: second.inputTokens,
    outputTokens: second.outputTokens,
  };
  const v2 = validateLlmJson(schema, second.rawOutput);
  if (v2.ok) return { data: v2.data, trace };

  throw new Error(
    `[${call.promptName}] LLM JSON validation failed after retry: ${v2.error}`,
  );
}

// =============================================================================
// Step 2 — Structured extraction
// =============================================================================
export async function parseJob(jobOfferText: string): Promise<{
  signals: JobSignals;
  trace: LlmTrace;
}> {
  const call: LlmCall = {
    promptName: "parse-job",
    promptVersion: PARSE_JOB_VERSION,
    system: PARSE_JOB_SYSTEM,
    user: PARSE_JOB_USER(jobOfferText),
  };
  const { data, trace } = await runValidated(call, JobSignalsSchema);
  return { signals: data, trace };
}

// =============================================================================
// Step 3 — Recommendation (deterministic — no LLM call)
// =============================================================================
export function recommendBlocks(
  blocks: ContentBlock[],
  signals: JobSignals,
): BlockRecommendation[] {
  return blocks
    .filter((b) => b.active)
    .map<BlockRecommendation>((b) => {
      const priority = scoreBlock(b, signals);
      return {
        blockId: b.id,
        blockType: b.type as BlockRecommendation["blockType"],
        title: b.title,
        priority,
        reason: explainScore(b, signals),
        recommendedDefault: priority >= 70,
      };
    })
    .sort((a, b) => b.priority - a.priority);
}

// =============================================================================
// Step 4 — Controlled rewrites
// =============================================================================

const SummarySchema = z.object({
  summary: z.string().min(1),
  rationale: z.string().min(1),
});

export async function tailorSummary(args: {
  currentSummary: string;
  signals: JobSignals;
  candidateFacts: unknown;
}): Promise<{ summary: string; rationale: string; trace: LlmTrace }> {
  const call: LlmCall = {
    promptName: "tailor-summary",
    promptVersion: TAILOR_SUMMARY_VERSION,
    system: TAILOR_SUMMARY_SYSTEM,
    user: TAILOR_SUMMARY_USER({
      currentSummary: args.currentSummary,
      jobSignalsJson: JSON.stringify(args.signals, null, 2),
      candidateFactsJson: JSON.stringify(args.candidateFacts, null, 2),
    }),
  };
  const { data, trace } = await runValidated(call, SummarySchema);
  return { summary: data.summary, rationale: data.rationale, trace };
}

const RewritesSchema = z.object({
  rewrites: z.array(
    z.object({
      targetId: z.string(),
      original: z.string(),
      suggested: z.string(),
      rationale: z.string(),
    }),
  ),
});

export async function rewriteBullets(args: {
  signals: JobSignals;
  bullets: { id: string; text: string }[];
}): Promise<{
  rewrites: { targetId: string; original: string; suggested: string; rationale: string }[];
  trace: LlmTrace;
}> {
  if (args.bullets.length === 0) {
    // Avoid an empty round-trip — synthesize an empty trace.
    return {
      rewrites: [],
      trace: {
        promptName: "rewrite-bullets",
        promptVersion: REWRITE_BULLETS_VERSION,
        system: REWRITE_BULLETS_SYSTEM,
        user: "",
        rawOutput: '{"rewrites":[]}',
        ms: 0,
        mocked: true,
        model: "skipped",
      },
    };
  }
  const call: LlmCall = {
    promptName: "rewrite-bullets",
    promptVersion: REWRITE_BULLETS_VERSION,
    system: REWRITE_BULLETS_SYSTEM,
    user: REWRITE_BULLETS_USER({
      jobSignalsJson: JSON.stringify(args.signals, null, 2),
      bulletsJson: JSON.stringify(args.bullets, null, 2),
    }),
  };
  const { data, trace } = await runValidated(call, RewritesSchema);
  return { rewrites: data.rewrites, trace };
}

// =============================================================================
// High-level "produce a full TailorResponse" — used by /api/tailor.
// =============================================================================
export async function buildTailorResponse(args: {
  sessionId: string;
  master: MasterResume;
  blocks: ContentBlock[];
  signals: JobSignals;
  request: TailorRequest;
}): Promise<{ response: TailorResponse; traces: LlmTrace[] }> {
  const traces: LlmTrace[] = [];

  const summary = await tailorSummary({
    currentSummary: args.master.profile_variants[0]?.text ?? "",
    signals: args.signals,
    candidateFacts: {
      capabilities: args.master.capability_pool.map((c) => c.text),
      experience: args.master.experience.map((e) => ({
        title: e.title,
        org: e.org,
        keywords: e.keywords,
      })),
      languages: args.master.languages.map((l) => l.name),
    },
  });
  traces.push(summary.trace);

  // Controlled rewrite — only the top 5 most-relevant bullets get touched.
  const allBullets = args.master.experience.flatMap((e) =>
    (e.bullets ?? []).map((b, i) => ({ id: `${e.id}#${i}`, text: b })),
  );
  const bulletsInput = allBullets.slice(0, 5);

  const bullets = await rewriteBullets({
    signals: args.signals,
    bullets: bulletsInput,
  });
  traces.push(bullets.trace);

  const recommendedBlocks = recommendBlocks(args.blocks, args.signals);

  const capabilityRecs = recommendedBlocks
    .filter((r) => r.blockType === "capability_bullet")
    .slice(0, 6)
    .map((r) => {
      const blk = args.blocks.find((b) => b.id === r.blockId)!;
      return {
        id: blk.refId ?? blk.id,
        text: blk.content,
        rationale: r.reason,
      };
    });

  const response: TailorResponse = {
    sessionId: args.sessionId,
    suggestedSummary: summary.summary,
    suggestedCapabilities: capabilityRecs,
    recommendedBlocks,
    bulletRewrites: bullets.rewrites.map((r) => ({
      fieldType: "experience_bullet",
      targetId: r.targetId,
      original: r.original,
      suggested: r.suggested,
      rationale: r.rationale,
    })),
  };

  return {
    response: TailorResponseSchema.parse(response),
    traces,
  };
}
