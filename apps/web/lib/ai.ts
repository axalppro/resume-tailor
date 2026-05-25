/**
 * ai.ts — AI pipeline orchestrator
 * --------------------------------
 * Implements the six-step pipeline described in the project brief:
 *
 *   1. Input collection
 *   2. Structured extraction (parseJob)
 *   3. Recommendation (recommendBlocks)
 *   4. Controlled rewrite (rewriteSummary, rewriteCapabilities, rewriteBullets)
 *   5. Human approval — happens in the UI, not here
 *   6. Rendering — handled by lib/typst.ts + the compiler microservice
 *
 * PHASE 1: Every LLM call is replaced by a deterministic MOCK. The mocks
 * return data that passes the same Zod schemas the real LLM responses will be
 * validated against in Phase 2, so the rest of the system can be exercised
 * end-to-end today without a provider key.
 *
 * Phase 2 will swap `mockLlmCall` for a real provider call; everything around
 * it (prompts, validation, retries, traceability) stays.
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
  SUGGEST_SECTIONS_SYSTEM,
  SUGGEST_SECTIONS_USER,
  SUGGEST_SECTIONS_VERSION,
  REWRITE_BULLETS_SYSTEM,
  REWRITE_BULLETS_USER,
  REWRITE_BULLETS_VERSION,
} from "@resume-tailor/prompts";
import { validateLlmJson } from "./validation";
import { scoreBlock, explainScore } from "./scoring";

// =============================================================================
// Provider abstraction — Phase 1 mock only
// =============================================================================

export interface LlmCall {
  promptName: string;
  promptVersion: number;
  system: string;
  user: string;
}

export interface LlmTrace extends LlmCall {
  rawOutput: string;
  ms: number;
  mocked: boolean;
}

/**
 * PHASE 1 MOCK — returns a deterministic string that, after JSON.parse +
 * schema validation, matches the contract of each prompt. In Phase 2 this is
 * the single function to swap for an OpenAI / Anthropic / etc. call.
 */
async function mockLlmCall(call: LlmCall): Promise<string> {
  switch (call.promptName) {
    case "parse-job":
      return JSON.stringify(MOCK_JOB_SIGNALS);
    case "tailor-summary":
      return JSON.stringify({
        summary: MOCK_TAILORED_SUMMARY,
        rationale:
          "Emphasises embedded firmware on STM32/Nordic, BLE/SPI/I2C, and IoT/Docker tooling — the offer's top required and preferred signals.",
      });
    case "rewrite-bullets":
      return JSON.stringify({ rewrites: MOCK_BULLET_REWRITES });
    case "suggest-sections":
      // Recommendations are computed deterministically from the scoring
      // function in this mock — see recommendBlocks().
      return JSON.stringify({ recommendations: [] });
    default:
      throw new Error(`Unknown prompt: ${call.promptName}`);
  }
}

async function runPrompt(call: LlmCall): Promise<LlmTrace> {
  const start = Date.now();
  const rawOutput = await mockLlmCall(call); // PHASE 1 MOCK
  return { ...call, rawOutput, ms: Date.now() - start, mocked: true };
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
  const trace = await runPrompt(call);
  const validated = validateLlmJson(JobSignalsSchema, trace.rawOutput);
  if (!validated.ok) {
    throw new Error(`parse-job validation failed: ${validated.error}`);
  }
  return { signals: validated.data, trace };
}

// =============================================================================
// Step 3 — Recommendation (deterministic scoring + optional LLM ranking)
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
        // ContentBlock.type is stored as a string in the DB; cast back to the
        // discriminated-union type from shared-types.
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
  const trace = await runPrompt(call);
  const parsed = JSON.parse(trace.rawOutput) as { summary: string; rationale: string };
  return { summary: parsed.summary, rationale: parsed.rationale, trace };
}

export async function rewriteBullets(args: {
  signals: JobSignals;
  bullets: { id: string; text: string }[];
}): Promise<{
  rewrites: { targetId: string; original: string; suggested: string; rationale: string }[];
  trace: LlmTrace;
}> {
  const call: LlmCall = {
    promptName: "rewrite-bullets",
    promptVersion: REWRITE_BULLETS_VERSION,
    system: REWRITE_BULLETS_SYSTEM,
    user: REWRITE_BULLETS_USER({
      jobSignalsJson: JSON.stringify(args.signals, null, 2),
      bulletsJson: JSON.stringify(args.bullets, null, 2),
    }),
  };
  const trace = await runPrompt(call);
  const parsed = JSON.parse(trace.rawOutput) as {
    rewrites: { targetId: string; original: string; suggested: string; rationale: string }[];
  };
  return { rewrites: parsed.rewrites, trace };
}

// =============================================================================
// High-level "produce a full TailorResponse" helper used by /api/tailor.
// =============================================================================
export async function buildTailorResponse(args: {
  sessionId: string;
  master: MasterResume;
  blocks: ContentBlock[];
  signals: JobSignals;
  request: TailorRequest;
}): Promise<TailorResponse> {
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

  const bulletsInput = args.master.experience
    .flatMap((e) =>
      (e.bullets ?? []).map((b, i) => ({ id: `${e.id}#${i}`, text: b })),
    )
    .slice(0, 5); // controlled rewrite — only top N bullets

  const bullets = await rewriteBullets({
    signals: args.signals,
    bullets: bulletsInput,
  });

  const recommendedBlocks = recommendBlocks(args.blocks, args.signals);

  // Suggested capabilities: pick the top-scored capability blocks.
  const capabilityRecs = recommendedBlocks
    .filter((r) => r.blockType === "capability_bullet")
    .slice(0, 6)
    .map((r) => {
      const blk = args.blocks.find((b) => b.id === r.blockId)!;
      return { id: blk.refId ?? blk.id, text: blk.content, rationale: r.reason };
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

  // Re-validate before handing back to the caller.
  return TailorResponseSchema.parse(response);
}

// =============================================================================
// PHASE 1 mock data — kept at the bottom so it's obvious what's fake.
// =============================================================================

const MOCK_JOB_SIGNALS: JobSignals = {
  keywords: ["STM32", "Nordic nRF", "BLE", "SPI", "I2C", "CAN", "FreeRTOS", "Docker", "InfluxDB", "Grafana"],
  requiredSkills: ["C", "C++", "ARM Cortex-M", "BLE", "SPI", "I2C", "RTOS", "Git"],
  preferredSkills: ["Docker", "InfluxDB", "Grafana", "Python", "Go", "TypeScript", "Robotics"],
  roleThemes: ["embedded firmware", "industrial IoT", "calibration tooling", "team collaboration"],
  suggestedEmphasis: [
    "Hands-on firmware experience on STM32 / Nordic nRF",
    "Industrial IoT and cloud data pipelines",
    "Calibration tooling and bench debugging",
    "Project leadership end-to-end",
  ],
};

const MOCK_TAILORED_SUMMARY =
  "Hands-on embedded systems engineer with firmware experience on STM32 and Nordic nRF platforms, BLE/SPI/I2C bring-up, and industrial IoT integrations using Docker, InfluxDB, and Grafana. Comfortable owning features from bench debugging to deployed product.";

const MOCK_BULLET_REWRITES = [
  {
    targetId: "hes-so-research-assistant#0",
    original:
      "Built calibration tooling and APIs in Go and C++/Qt for industrial PLC deployments.",
    suggested:
      "Designed calibration tooling and APIs in Go and C++/Qt to support industrial PLC deployments and bench-level validation.",
    rationale:
      "Lead with 'Designed' to mirror the offer's 'design and ship firmware' framing; keep all underlying tools and scope unchanged.",
  },
  {
    targetId: "hes-so-research-assistant#1",
    original:
      "Designed and deployed a private 5G station, handling SIM provisioning and performance analysis.",
    suggested:
      "Brought up and deployed a private 5G station end-to-end, including SIM provisioning and performance analysis.",
    rationale:
      "Echoes 'bring up new boards' language from the JD without inventing any new responsibility.",
  },
];
