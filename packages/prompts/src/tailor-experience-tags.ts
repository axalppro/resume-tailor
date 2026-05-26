/**
 * prompt: tailor-experience-tags
 * version: 1
 *
 * Phase 3.6: emits one consolidated keyword line per experience role. Renders
 * in the PDF as a single italic "Tech: kw \u00b7 kw \u00b7 \u2026" line BELOW the role's
 * bullets.
 *
 * Truth rule (enforced both here and by a defensive filter in apps/web/lib/ai.ts):
 *  - Tags MUST come from the MASTER KEYWORD POOL passed in the user message.
 *    No new tokens, no JD-only terms, no model-knowledge tools.
 *  - The pool is the union of every keyword/tag present anywhere in the
 *    master resume (experience keywords, capability tags, project keywords,
 *    certification tags, language tags). The AI is free to pick from any of
 *    them \u2014 not just keywords on this specific role \u2014 but it MUST NOT make up
 *    new ones.
 */

import { DIRECTIVES_SAFETY_ADDENDUM, formatDirectivesBlock } from "./directives";

export const TAILOR_EXPERIENCE_TAGS_VERSION = 1;

export const TAILOR_EXPERIENCE_TAGS_SYSTEM = `You pick the most relevant technical keywords to surface as a "Tech:" sub-line under each experience role on a tailored resume.

OUTPUT FORMAT (strict JSON, nothing else):
{
  "tags": [
    {
      "experienceId": string,
      "tags": string[],
      "rationale": string
    }
  ]
}

CONTENT RULES:
- For each role, pick 4 to 8 keywords from the MASTER KEYWORD POOL that best signal "this person did this kind of work, with these tools" for the target JOB SIGNALS.
- Order matters: most JD-relevant first.
- Prefer concrete tools / frameworks / standards / domains over generic adjectives ("Python" > "programming").
- If two keywords are near-synonyms, keep only the one that matches the JD's wording.
- "rationale" is one short sentence explaining the choice for that role.

TRUTH RULES (hardest):
- Every tag you output MUST appear verbatim (case-insensitive) in the provided MASTER KEYWORD POOL. No invented tokens. No JD-only tokens that the candidate has never used. No reformulations.
- If the master pool is too narrow to fill 4 tags, return fewer tags rather than padding with fabrications.

${DIRECTIVES_SAFETY_ADDENDUM}`;

export const TAILOR_EXPERIENCE_TAGS_USER = (args: {
  jobSignalsJson: string;
  experiencesJson: string;
  masterKeywordPoolJson: string;
  generalDirective?: string;
}) => {
  const directives = formatDirectivesBlock(
    "general",
    undefined,
    args.generalDirective,
  );
  return `JOB SIGNALS:
${args.jobSignalsJson}

EXPERIENCES (each item: { id, title, org, bullets: string[], ownKeywords: string[] }):
${args.experiencesJson}

MASTER KEYWORD POOL (the ONLY allowed tag values \u2014 the union of every keyword/tag anywhere in the candidate's master resume):
${args.masterKeywordPoolJson}
${directives ? `\n${directives}\n` : ""}
Return JSON in the exact shape described above. One entry per experience, preserving "experienceId".`;
};
