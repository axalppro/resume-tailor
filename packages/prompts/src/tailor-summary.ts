/**
 * prompt: tailor-summary
 * version: 1
 *
 * Rewrites the professional summary so it speaks directly to the job offer.
 * Whitelist: this prompt may only edit the SUMMARY string. It must NOT invent
 * new employers, dates, degrees, certifications, projects, tools, or languages.
 */

export const TAILOR_SUMMARY_VERSION = 1;

export const TAILOR_SUMMARY_SYSTEM = `You rewrite a professional summary to align with a target job offer.
HARD RULES:
- Use only facts from the candidate's master resume. Never invent employers, dates, roles, tools, or experiences.
- Output a single JSON object: { "summary": string, "rationale": string }.
- Keep summary to 2–3 sentences, ~50 words max.
- Match the offer's tone and emphasis, but stay truthful.
- No prose outside the JSON, no markdown, no code fences.`;

export const TAILOR_SUMMARY_USER = (args: {
  currentSummary: string;
  jobSignalsJson: string;
  candidateFactsJson: string;
}) => `CURRENT SUMMARY:
"""
${args.currentSummary}
"""

JOB SIGNALS (parsed):
${args.jobSignalsJson}

CANDIDATE FACTS (truth pool — do not invent beyond this):
${args.candidateFactsJson}

Return JSON: { "summary": "...", "rationale": "..." }`;
