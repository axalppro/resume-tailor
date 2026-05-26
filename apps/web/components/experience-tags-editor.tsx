"use client";

/**
 * ExperienceTagsEditor — Phase 3.6 picker for the per-role "Tech: …" keyword
 * line that renders below each experience entry's bullets.
 *
 * One row per master.experience entry; each row is a single editable
 * comma-separated chip input seeded from the AI's `tailorResponse.experienceTags`
 * (matched by experienceId). Emits `ApprovedExperienceTags[]` upward.
 *
 * Truth rule reminder: `ai.ts/tailorExperienceTags` already filters the AI's
 * picks against the master keyword pool. This editor does NOT enforce that
 * — the user is the final arbiter and can add/remove freely after approval.
 */
import { useEffect, useMemo, useRef, useState } from "react";

interface ExperienceLite {
  id: string;
  title: string;
  org: string;
}

interface SuggestedRoleTags {
  experienceId: string;
  tags: string[];
  rationale?: string;
}

interface Props {
  experiences: ExperienceLite[];
  suggestions: SuggestedRoleTags[];
  onChange?: (rows: { experienceId: string; tags: string[] }[]) => void;
}

function parseChips(csv: string): string[] {
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function buildInitial(
  experiences: ExperienceLite[],
  suggestions: SuggestedRoleTags[],
): Record<string, string> {
  const byId = new Map(suggestions.map((s) => [s.experienceId, s]));
  return Object.fromEntries(
    experiences.map((e) => [e.id, (byId.get(e.id)?.tags ?? []).join(", ")]),
  );
}

export function ExperienceTagsEditor({
  experiences,
  suggestions,
  onChange,
}: Props) {
  const initial = useMemo(
    () => buildInitial(experiences, suggestions),
    [experiences, suggestions],
  );

  // Content-key re-seed guard — same pattern used across the picker family.
  // CRITICAL: `experiences` and `suggestions` are fresh array references on
  // every parent render (they come from a `.map()` in TailoringSession). We
  // MUST NOT depend on the array reference directly — hash to a string key.
  const seedKey = useMemo(
    () =>
      experiences
        .map(
          (e) =>
            `${e.id}::${(
              suggestions.find((s) => s.experienceId === e.id)?.tags ?? []
            ).join("|")}`,
        )
        .join("||"),
    [experiences, suggestions],
  );
  const [csvById, setCsvById] = useState<Record<string, string>>(initial);
  const lastSeedKey = useRef(seedKey);

  useEffect(() => {
    if (lastSeedKey.current === seedKey) return;
    lastSeedKey.current = seedKey;
    setCsvById(initial);
  }, [seedKey, initial]);

  // Emit upward.
  // CRITICAL: parent passes `experiences` as a fresh array on every render,
  // so depending on it directly retriggers this effect every render → calls
  // onChange → parent setState → re-render → infinite loop. We hash the
  // experience IDs into a stable string key, hold the latest array in a ref,
  // and only fire when csvById OR the ID list actually changes.
  const expIdsKey = useMemo(() => experiences.map((e) => e.id).join("|"), [
    experiences,
  ]);
  const expRef = useRef(experiences);
  expRef.current = experiences;

  useEffect(() => {
    const rows = expRef.current.map((e) => ({
      experienceId: e.id,
      tags: parseChips(csvById[e.id] ?? ""),
    }));
    onChange?.(rows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [csvById, expIdsKey]);

  if (experiences.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No experience entries in the master resume.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        One italic <span className="font-mono">Tech: …</span> line is rendered
        beneath each role&rsquo;s bullets. Comma-separated. Leave a row empty
        to skip the sub-line for that role.
      </p>
      {experiences.map((e) => {
        const csv = csvById[e.id] ?? "";
        const chips = parseChips(csv);
        return (
          <div
            key={e.id}
            className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              {e.title} — {e.org}
            </div>
            <input
              type="text"
              value={csv}
              onChange={(ev) =>
                setCsvById((all) => ({ ...all, [e.id]: ev.target.value }))
              }
              placeholder="e.g. C++, Qt, Docker, Private 5G"
              className="mt-2 w-full rounded border border-slate-300 px-2 py-1 text-sm"
            />
            {chips.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {chips.map((c, i) => (
                  <span
                    key={`${c}-${i}`}
                    className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] text-brand-dark"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
