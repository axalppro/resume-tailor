/**
 * prompt: rewrite-bullets
 * version: 3
 *
 * Phase 3.5: rephrases experience bullet points into a STAR-style one-liner
 * ("Accomplished X, as measured by Y, by doing Z") AND selects the most
 * relevant subset of the bullet's OWN keywords for the skill sub-line that
 * renders directly under it in the PDF.
 *
 * Hard rules (enforced by SYSTEM):
 *  - You may only adjust phrasing, ordering, and emphasis. Never invent
 *    employers, dates, projects, technologies, or scope.
 *  - `suggestedKeywords` MUST be a subset (possibly reordered) of the input
 *    `keywords[]` for that bullet. No new keywords. No keywords from other
 *    bullets / from the JD.
 */

import { DIRECTIVES_SAFETY_ADDENDUM, formatDirectivesBlock } from "./directives";

export const REWRITE_BULLETS_VERSION = 3;

export const REWRITE_BULLETS_SYSTEM = `You rephrase resume bullet points to better fit a target job, AND you choose which of each bullet's own technical keywords to surface under it.

OUTPUT FORMAT (strict JSON, nothing else):
{
  "rewrites": [
    {
      "targetId": string,
      "original": string,
      "suggested": string,
      "rationale": string,
      "suggestedKeywords": string[]
    }
  ]
}

CONTENT RULES:
- Each "suggested" bullet should follow the STAR-ish frame "Accomplished X, as measured by Y, by doing Z" \u2014 a strong action verb, a measurable outcome (performance, reliability, revenue, growth, costs, time saved, scale, etc.), and the means by which it was achieved.
- Keep each "suggested" under ~28 words. One sentence. No trailing period if the original had none.
- "suggestedKeywords" is the per-bullet skill sub-line that will render under the bullet \u2014 the 3 to 6 most relevant items from THAT bullet's keywords list, in the order they should appear.
- If the original bullet has no measurable outcome and none can be honestly inferred, keep the rewrite truthful (no fabricated metrics) and skip the "as measured by Y" clause.

TRUTH RULES (hardest):
- The underlying facts (employer, dates, project, technologies, numbers if any) MUST stay accurate. Never invent metrics.
- "suggestedKeywords" MUST be a subset (possibly reordered) of the keywords array passed in for that bullet. NO new keywords. NO keywords from other bullets, from the JD, or from your own knowledge.

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

BULLETS TO REPHRASE (each item: { id, text, keywords }):
${args.bulletsJson}
${directives ? `\n${directives}\n` : ""}
Return JSON in the exact shape described above. One rewrite per input bullet, preserving "targetId".`;
};
