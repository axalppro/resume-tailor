/**
 * prompt: rewrite-bullets
 * version: 1
 *
 * Rephrases a small number of experience bullet points to better match the
 * job offer. Whitelist: phrasing only. The underlying facts (employer, dates,
 * project, tools mentioned) MUST NOT change.
 */

export const REWRITE_BULLETS_VERSION = 1;

export const REWRITE_BULLETS_SYSTEM = `You rephrase resume bullet points to better fit a target job.
HARD RULES:
- Do NOT change the underlying facts: employer, dates, project, technologies, or scope.
- You may only adjust phrasing, emphasis, and ordering of words.
- Keep each bullet under ~28 words, starting with a strong verb.
- Output JSON: { "rewrites": [{ "targetId": string, "original": string, "suggested": string, "rationale": string }] }
- No prose outside the JSON.`;

export const REWRITE_BULLETS_USER = (args: {
  jobSignalsJson: string;
  bulletsJson: string;
}) => `JOB SIGNALS:
${args.jobSignalsJson}

BULLETS TO REPHRASE (each item has id + text):
${args.bulletsJson}

Return JSON in the exact shape described above.`;
