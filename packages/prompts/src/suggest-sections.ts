/**
 * prompt: suggest-sections
 * version: 1
 *
 * Scores each candidate ContentBlock against the JobSignals and returns
 * recommendations. The MODEL DOES NOT INCLUDE anything in the final resume —
 * it only suggests. The UI presents these to the user as checkboxes.
 */

import { DIRECTIVES_SAFETY_ADDENDUM, formatDirectivesBlock } from "./directives";

export const SUGGEST_SECTIONS_VERSION = 2;

export const SUGGEST_SECTIONS_SYSTEM = `You rank candidate resume content blocks against a target job offer.
HARD RULES:
- Use only the blocks provided. Never invent new blocks.
- Return a JSON object: { "recommendations": [{ "blockId": string, "priority": 0-100, "reason": string, "recommendedDefault": boolean }] }
- "priority" is your confidence that this block strengthens the application.
- "recommendedDefault" is true ONLY for blocks you would default-check in the UI.
- No prose outside the JSON.

${DIRECTIVES_SAFETY_ADDENDUM}`;

export const SUGGEST_SECTIONS_USER = (args: {
  jobSignalsJson: string;
  blocksJson: string;
  capabilitiesDirective?: string;
  generalDirective?: string;
}) => {
  const directives = formatDirectivesBlock(
    "section selection",
    args.capabilitiesDirective,
    args.generalDirective,
  );
  return `JOB SIGNALS:
${args.jobSignalsJson}

CANDIDATE BLOCKS (from the master resume; rank each):
${args.blocksJson}
${directives ? `\n${directives}\n` : ""}
Return JSON in the exact shape described above.`;
};
