/**
 * prompt: rewrite-bullets
 * version: 4
 *
 * Phase 3.6: rephrases experience bullet points into a STAR-style one-liner
 * ("Accomplished X, as measured by Y, by doing Z"). Per-bullet keywords were
 * removed in Phase 3.6 — keyword selection now happens once per ROLE via the
 * separate `tailor-experience-tags` prompt.
 *
 * Hard rules (enforced by SYSTEM):
 *  - You may only adjust phrasing, ordering, and emphasis. Never invent
 *    employers, dates, projects, technologies, or scope.
 *  - Never invent metrics. If the original had no measurable outcome and one
 *    cannot be honestly inferred from the bullet, skip the "as measured by Y"
 *    clause rather than fabricating numbers.
 */

import { DIRECTIVES_SAFETY_ADDENDUM, formatDirectivesBlock } from "./directives";

export const REWRITE_BULLETS_VERSION = 4;

export const REWRITE_BULLETS_SYSTEM = `You rephrase resume bullet points to better fit a target job.

OUTPUT FORMAT (strict JSON, nothing else):
{
  "rewrites": [
    {
      "targetId": string,
      "original": string,
      "suggested": string,
      "rationale": string
    }
  ]
}

CONTENT RULES:
- Each "suggested" bullet should follow the STAR-ish frame "Accomplished X, as measured by Y, by doing Z" \u2014 a strong action verb, a measurable outcome (performance, reliability, revenue, growth, costs, time saved, scale, etc.), and the means by which it was achieved.
- Keep each "suggested" under ~28 words. One sentence. No trailing period if the original had none.
- If the original bullet has no measurable outcome and none can be honestly inferred, keep the rewrite truthful (no fabricated metrics) and skip the "as measured by Y" clause.
- "rationale" is one short sentence explaining WHY this rewrite better fits the job signals.

TRUTH RULES (hardest):
- The underlying facts (employer, dates, project, technologies, numbers if any) MUST stay accurate. Never invent metrics, never invent technologies, never invent scope.
- Do NOT add a per-bullet technology sub-line, tags array, or keyword list \u2014 those are handled by a separate prompt that runs over the whole role.

${DIRECTIVES_SAFETY_ADDENDUM}`;

export const REWRITE_BULLETS_USER = (args: {
  jobSignalsJson: string;
  bulletsJson: string;
  bulletsDirective?: string;
  generalDirective?: string;
}) => {
  const directives = formatDirectivesBlock(
    "bullets",
    args.bulletsDirective,
    args.generalDirective,
  );
  return `JOB SIGNALS:
${args.jobSignalsJson}

BULLETS TO REPHRASE (each item: { id, text }):
${args.bulletsJson}
${directives ? `\n${directives}\n` : ""}
Return JSON in the exact shape described above. One rewrite per input bullet, preserving "targetId".`;
};
