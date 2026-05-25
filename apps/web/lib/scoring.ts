/**
 * scoring.ts — deterministic tag/keyword overlap scoring used by the mocked
 * recommendation step and as a fallback when the LLM is not available.
 */
import type { ContentBlock, JobSignals } from "@resume-tailor/shared-types";

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9+#./ -]/g, " ");
}

function tokens(s: string): Set<string> {
  return new Set(
    normalize(s)
      .split(/\s+/)
      .filter((t) => t.length > 1),
  );
}

export function scoreBlock(block: ContentBlock, signals: JobSignals): number {
  const haystack = tokens(`${block.title} ${block.content} ${block.tags.join(" ")}`);
  const needles = new Set<string>();
  for (const k of [
    ...signals.keywords,
    ...signals.requiredSkills,
    ...signals.preferredSkills,
    ...signals.roleThemes,
  ]) {
    for (const t of tokens(k)) needles.add(t);
  }

  let hits = 0;
  for (const n of needles) if (haystack.has(n)) hits++;

  // Required skills are worth more than preferred.
  let reqHits = 0;
  for (const k of signals.requiredSkills) {
    for (const t of tokens(k)) if (haystack.has(t)) reqHits++;
  }

  const base = block.defaultPriority; // 0-100
  const bonus = Math.min(40, hits * 4 + reqHits * 3);
  return Math.min(100, base + bonus);
}

export function explainScore(block: ContentBlock, signals: JobSignals): string {
  const haystack = tokens(`${block.title} ${block.content} ${block.tags.join(" ")}`);
  const matchedReq = signals.requiredSkills.filter((k) =>
    [...tokens(k)].some((t) => haystack.has(t)),
  );
  const matchedPref = signals.preferredSkills.filter((k) =>
    [...tokens(k)].some((t) => haystack.has(t)),
  );

  if (matchedReq.length > 0) {
    return `Matches required skills: ${matchedReq.slice(0, 3).join(", ")}`;
  }
  if (matchedPref.length > 0) {
    return `Matches preferred skills: ${matchedPref.slice(0, 3).join(", ")}`;
  }
  return `Default priority for this section type`;
}
