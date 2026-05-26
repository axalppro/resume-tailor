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
  type Directives,
  type TailoredSkill,
  type ExperienceBullet,
  TailorResponseSchema,
  normalizeBullets,
} from "@resume-tailor/shared-types";
import {
  PARSE_JOB_SYSTEM,
  PARSE_JOB_USER,
  PARSE_JOB_VERSION,
  TAILOR_SUMMARY_SYSTEM,
  TAILOR_SUMMARY_USER,
  TAILOR_SUMMARY_VERSION,
  TAILOR_SKILLS_SYSTEM,
  TAILOR_SKILLS_USER,
  TAILOR_SKILLS_VERSION,
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
        // CRITICAL: forward refId so the UI can pass the master-entity id
        // into ApprovedTailoring.selected.* arrays. Without this, the Typst
        // renderer's `get-by-id` calls return empty and the section bodies
        // disappear even when the headers are shown.
        refId: b.refId,
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
  directives?: Directives;
}): Promise<{ summary: string; rationale: string; trace: LlmTrace }> {
  const call: LlmCall = {
    promptName: "tailor-summary",
    promptVersion: TAILOR_SUMMARY_VERSION,
    system: TAILOR_SUMMARY_SYSTEM,
    user: TAILOR_SUMMARY_USER({
      currentSummary: args.currentSummary,
      jobSignalsJson: JSON.stringify(args.signals, null, 2),
      candidateFactsJson: JSON.stringify(args.candidateFacts, null, 2),
      summaryDirective: args.directives?.summary,
      generalDirective: args.directives?.general,
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
      suggestedKeywords: z.array(z.string()).default([]),
    }),
  ),
});

/**
 * Phase 3.5 rewrite-bullets input shape — carries per-bullet keywords so the
 * model can pick a subset for the skill sub-line that renders under each
 * bullet in the PDF.
 */
export interface RewriteBulletsInput {
  id: string;
  text: string;
  keywords: string[];
}

export async function rewriteBullets(args: {
  signals: JobSignals;
  bullets: RewriteBulletsInput[];
  directives?: Directives;
}): Promise<{
  rewrites: {
    targetId: string;
    original: string;
    suggested: string;
    rationale: string;
    suggestedKeywords: string[];
  }[];
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
      bulletsDirective: args.directives?.bullets,
      generalDirective: args.directives?.general,
    }),
  };
  const { data, trace } = await runValidated(call, RewritesSchema);

  // Defensive truth-rule enforcement: drop any suggestedKeyword that wasn't in
  // the original bullet's keywords[]. The prompt forbids fabrication, but if
  // the model slips, this is the last line of defence before the PDF.
  const byId = new Map(args.bullets.map((b) => [b.id, new Set(b.keywords)]));
  const cleaned = data.rewrites.map((r) => {
    const allowed = byId.get(r.targetId);
    const requested = r.suggestedKeywords ?? [];
    return {
      ...r,
      suggestedKeywords: allowed
        ? requested.filter((k) => allowed.has(k))
        : [],
    };
  });
  return { rewrites: cleaned, trace };
}

// =============================================================================
// Step 4b — Tailor skills (replaces the legacy capability_pool pick)
// =============================================================================
const TailoredSkillsSchema = z.object({
  skills: z.array(
    z.object({
      id: z.string(),
      title: z.string().min(1),
      details: z.string().min(1),
      rationale: z.string(),
    }),
  ),
});

export async function tailorSkills(args: {
  signals: JobSignals;
  candidateFacts: unknown;
  directives?: Directives;
}): Promise<{ skills: TailoredSkill[]; trace: LlmTrace }> {
  const call: LlmCall = {
    promptName: "tailor-skills",
    promptVersion: TAILOR_SKILLS_VERSION,
    system: TAILOR_SKILLS_SYSTEM,
    user: TAILOR_SKILLS_USER({
      jobSignalsJson: JSON.stringify(args.signals, null, 2),
      candidateFactsJson: JSON.stringify(args.candidateFacts, null, 2),
      capabilitiesDirective: args.directives?.capabilities,
      generalDirective: args.directives?.general,
    }),
  };
  const { data, trace } = await runValidated(call, TailoredSkillsSchema);
  return { skills: data.skills, trace };
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
  /**
   * Phase 3: merged tailoring directives (global + per-job, with per-job
   * overlaying global). Optional — omitted or empty fields produce the same
   * prompts as Phase 2. Style guidance only; the safety addendum in each
   * tailor prompt forbids using directives to fabricate facts.
   */
  directives?: Directives;
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
    directives: args.directives,
  });
  traces.push(summary.trace);

  // Controlled rewrite — Phase 3.5 sends EVERY master bullet (no slice cap)
  // so the user's BulletPicker UI can offer a checkbox for each one. Each
  // bullet carries its own keywords[] (normalised from legacy string[] when
  // needed) so the AI can pick the per-bullet skill sub-line.
  const allBullets: { id: string; text: string; keywords: string[]; experienceId: string }[] =
    args.master.experience.flatMap((e) => {
      const normalised: ExperienceBullet[] = normalizeBullets(e.bullets, e.id);
      return normalised.map((b) => ({
        id: b.id,
        text: b.text,
        // Per-bullet keywords first; fall back to the entry-level keywords for
        // legacy bullets that don't carry their own list yet.
        keywords: b.keywords.length > 0 ? b.keywords : e.keywords,
        experienceId: e.id,
      }));
    });

  const bullets = await rewriteBullets({
    signals: args.signals,
    bullets: allBullets.map((b) => ({ id: b.id, text: b.text, keywords: b.keywords })),
    directives: args.directives,
  });
  traces.push(bullets.trace);

  // Phase 3.5: skills are AI-synthesised, not picked from capability_pool.
  const skills = await tailorSkills({
    signals: args.signals,
    candidateFacts: {
      capabilities: args.master.capability_pool.map((c) => ({
        text: c.text,
        tags: c.tags,
      })),
      experience: args.master.experience.map((e) => ({
        title: e.title,
        org: e.org,
        keywords: e.keywords,
        tags: e.tags,
        bullets: normalizeBullets(e.bullets, e.id).map((b) => b.text),
      })),
      projects: args.master.projects.map((p) => ({
        title: p.title,
        subtitle: p.subtitle,
        keywords: p.keywords,
      })),
      education: args.master.education.map((e) => ({
        title: e.title,
        institution: e.institution,
        keywords: e.keywords,
      })),
      certifications: args.master.certifications.map((c) => ({
        title: c.title,
        issuer: c.issuer,
      })),
      languages: args.master.languages.map((l) => l.name),
    },
    directives: args.directives,
  });
  traces.push(skills.trace);

  const recommendedBlocks = recommendBlocks(args.blocks, args.signals);

  // Build the per-bullet experienceId lookup so we can attach it to each
  // SuggestedEdit — the UI groups bullets by experience entry.
  const experienceIdByBulletId = new Map(
    allBullets.map((b) => [b.id, b.experienceId]),
  );

  const response: TailorResponse = {
    sessionId: args.sessionId,
    suggestedSummary: summary.summary,
    suggestedCapabilities: skills.skills,
    recommendedBlocks,
    bulletRewrites: bullets.rewrites.map((r) => ({
      fieldType: "experience_bullet",
      targetId: r.targetId,
      experienceId: experienceIdByBulletId.get(r.targetId),
      original: r.original,
      suggested: r.suggested,
      rationale: r.rationale,
      suggestedKeywords: r.suggestedKeywords,
    })),
  };

  return {
    response: TailorResponseSchema.parse(response),
    traces,
  };
}
