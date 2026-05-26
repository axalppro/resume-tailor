"use client";

/**
 * BulletPicker — Phase 3.6 picker for the Professional Experience section.
 *
 * Phase 3.6 simplification: each row is just a checkbox + the AI's suggested
 * text (read-only). The original/suggested/custom radios and per-bullet
 * skills CSV input from Phase 3.5 are gone — keyword lines now live on a
 * single per-role row in <ExperienceTagsEditor>.
 *
 * Output to the parent: one ApprovedBulletRewrite-shaped object per AI edit,
 * including unchecked ones (`included=false`). The Typst renderer skips
 * `included=false` rows. "Decline AI rewrite" = uncheck the row.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { SuggestedEdit } from "@resume-tailor/shared-types";

interface ExperienceLite {
  id: string;
  title: string;
  org: string;
}

interface Props {
  edits: SuggestedEdit[];
  /** Used to render the experience group headers. */
  experiences: ExperienceLite[];
  onChange?: (
    approved: {
      targetId: string;
      experienceId?: string;
      text: string;
      included: boolean;
    }[],
  ) => void;
}

type Decision = {
  included: boolean;
};

function initialDecisions(edits: SuggestedEdit[]): Record<string, Decision> {
  return Object.fromEntries(
    edits.map((e) => [e.targetId, { included: true }]),
  );
}

export function BulletPicker({ edits, experiences, onChange }: Props) {
  const initial = useMemo(() => initialDecisions(edits), [edits]);

  // Content-key re-seed guard — same pattern used by SkillsRanked /
  // CheckboxSectionPicker to stop the "Maximum update depth exceeded" loop
  // that bit Phase 3 when this component used a naive `useEffect([edits])`
  // resync.
  const seedKey = useMemo(
    () => edits.map((e) => `${e.targetId}:${e.suggested}`).join("||"),
    [edits],
  );
  const [decisions, setDecisions] = useState<Record<string, Decision>>(initial);
  const lastSeedKey = useRef(seedKey);

  useEffect(() => {
    if (lastSeedKey.current === seedKey) return;
    lastSeedKey.current = seedKey;
    setDecisions(initial);
  }, [seedKey, initial]);

  // Emit upward on every change.
  useEffect(() => {
    const out = edits.map((e) => {
      const d = decisions[e.targetId];
      return {
        targetId: e.targetId,
        experienceId: e.experienceId,
        text: e.suggested,
        included: d?.included ?? true,
      };
    });
    onChange?.(out);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decisions, edits]);

  function setDecision(id: string, patch: Partial<Decision>) {
    setDecisions((all) => ({ ...all, [id]: { ...all[id], ...patch } }));
  }

  if (edits.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No bullet rewrites suggested. Re-run &ldquo;Tailor with AI&rdquo;.
      </p>
    );
  }

  // Group edits by parent experience so the UI mirrors the rendered PDF.
  // Bullets with no experienceId fall under an "Unassigned" group so they're
  // still visible (defensive — legacy sessions may lack experienceId).
  const expById = new Map(experiences.map((e) => [e.id, e]));
  const groups = new Map<string, SuggestedEdit[]>();
  for (const e of edits) {
    const key = e.experienceId ?? "__unassigned__";
    const arr = groups.get(key) ?? [];
    arr.push(e);
    groups.set(key, arr);
  }
  // Preserve master experiences order; trailing unassigned at the end.
  const orderedKeys: string[] = [
    ...experiences.map((e) => e.id).filter((id) => groups.has(id)),
    ...(groups.has("__unassigned__") ? ["__unassigned__"] : []),
  ];

  const totalIncluded = Object.values(decisions).filter((d) => d.included).length;

  return (
    <div className="space-y-4">
      <div className="text-xs text-slate-500">
        {totalIncluded} of {edits.length} bullets included. Uncheck a row to
        drop it from the rendered PDF.
      </div>
      {orderedKeys.map((key) => {
        const exp = key === "__unassigned__" ? null : expById.get(key);
        const groupEdits = groups.get(key) ?? [];
        return (
          <div key={key} className="space-y-2">
            <div className="border-b border-slate-200 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
              {exp ? `${exp.title} — ${exp.org}` : "Unassigned"}
            </div>
            {groupEdits.map((e) => {
              const d = decisions[e.targetId];
              const included = d?.included ?? true;
              return (
                <div
                  key={e.targetId}
                  className={`rounded-lg border p-3 shadow-sm ${
                    included
                      ? "border-brand/40 bg-white"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={included}
                      onChange={() =>
                        setDecision(e.targetId, { included: !included })
                      }
                      className="mt-1"
                      aria-label="Include this bullet"
                    />
                    <div className="flex-1">
                      <div className="text-[10px] font-mono text-slate-400">
                        {e.targetId}
                      </div>
                      <div
                        className={`mt-1 text-sm ${
                          included ? "text-slate-800" : "text-slate-500"
                        }`}
                      >
                        {e.suggested}
                      </div>
                      {e.rationale && (
                        <div className="mt-1 text-[10px] italic text-slate-500">
                          Why: {e.rationale}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
