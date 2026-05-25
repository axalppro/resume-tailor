/**
 * prompt: parse-job
 * version: 1
 *
 * Purpose: extract a strictly-shaped JobSignals JSON object from raw job-offer
 * text. The LLM MUST return JSON conforming to `JobSignalsSchema`
 * (packages/shared-types/src/job.ts). Validation runs after every call; on
 * failure the route handler retries with a tighter "fix the JSON" prompt.
 */

export const PARSE_JOB_VERSION = 1;

export const PARSE_JOB_SYSTEM = `You are a precise job-description analyzer.
Return ONLY valid JSON matching the schema. No prose, no markdown, no code fences.
Never fabricate skills that are not present or strongly implied by the text.
If a field has no signal, return an empty array — never null.`;

export const PARSE_JOB_USER = (jobOfferText: string) => `Analyze the following job offer.

Extract:
- keywords: salient terms (technologies, products, domains)
- requiredSkills: skills explicitly listed as required / must-have
- preferredSkills: skills listed as nice-to-have / preferred / bonus
- roleThemes: 3–6 high-level themes (e.g. "embedded systems", "5G", "team leadership")
- suggestedEmphasis: 3–6 areas the candidate should emphasise on their resume

Return JSON with this exact shape:
{
  "keywords": string[],
  "requiredSkills": string[],
  "preferredSkills": string[],
  "roleThemes": string[],
  "suggestedEmphasis": string[]
}

JOB OFFER:
"""
${jobOfferText}
"""`;
