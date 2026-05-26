/**
 * prompt: tailor-skills
 * version: 1
 *
 * Phase 3.5: replaces the old `suggest-sections`-driven \"pick from
 * capability_pool\" flow for the Skills section. The AI synthesises a fresh,
 * JD-tailored list of skill entries with a bold 1\u20133 word `title` plus a
 * short `details` line (e.g. `Electronics design: Hands-on experience with
 * schematics, PCB design, hardware testing.`).
 *
 * HARD invariants (enforced by SYSTEM):
 *  - Every title + details combination MUST be grounded in the master's existing
 *    facts \u2014 the AI may rephrase / reorganise / aggregate, but it must NOT
 *    invent new tools, employers, projects, certifications, languages.
 *  - The output is structured JSON only; the route validates against
 *    `TailoredSkillSchema[]`.
 */
import { DIRECTIVES_SAFETY_ADDENDUM, formatDirectivesBlock } from "./directives";

export const TAILOR_SKILLS_VERSION = 1;

export const TAILOR_SKILLS_SYSTEM = `You synthesise the SKILLS section of a one-page resume to fit a target job offer.

OUTPUT FORMAT (strict JSON, nothing else):
{
  "skills": [
    { "id": string, "title": string, "details": string, "rationale": string }
  ]
}

CONTENT RULES:
- Produce between 5 and 8 skill entries. Order them by descending relevance to the JD.
- "title" is 1\u20133 words, capitalised like a proper noun (e.g. "Electronics design", "Embedded software", "Full-stack web").
- "details" is ONE concise sentence (\u2264 ~18 words). Concrete, with technologies / domains. Avoid filler ("strong", "passionate", "great").
- "rationale" is a single short sentence explaining why this entry fits the JD.
- "id" is a stable kebab-case slug derived from the title (e.g. "electronics-design").

TRUTH RULES (hardest):
- You are given CANDIDATE FACTS \u2014 a JSON blob with the master capability pool, experience entries (title/org/keywords/tags/bullets), education, projects, certifications, languages.
- Every "title" + "details" MUST be grounded in these facts. You may rephrase, aggregate, or re-frame, but you MUST NOT introduce any technology, project, employer, role, certification, or language that is not present in CANDIDATE FACTS.
- If the JD asks for a skill that has no evidence in CANDIDATE FACTS, do NOT invent one. Stay silent on that skill.

${DIRECTIVES_SAFETY_ADDENDUM}`;

export const TAILOR_SKILLS_USER = (args: {
  jobSignalsJson: string;
  candidateFactsJson: string;
  capabilitiesDirective?: string;
  generalDirective?: string;
}) => {
  const directives = formatDirectivesBlock(
    "skills",
    args.capabilitiesDirective,
    args.generalDirective,
  );
  return `JOB SIGNALS:
${args.jobSignalsJson}

CANDIDATE FACTS (single source of truth \u2014 do not invent beyond this):
${args.candidateFactsJson}
${directives ? `\n${directives}\n` : ""}
Return JSON in the exact shape described above.`;
};
