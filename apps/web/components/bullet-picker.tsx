"use client";

/**
 * BulletPicker — Phase 3.5 picker for the Professional Experience section.
 *
 * Replaces the old `BulletRewritesReview`. The differences are:
 *  - Bullets are GROUPED by parent experience entry so the user sees the full
 *    set of accomplishments per role at a glance instead of a flat list.
 *  - Every row has a CHECKBOX so the user can choose to include or omit each
 *    bullet from the rendered PDF. Manual-first: nothing is auto-included
 *    until the user ticks it (we default to "checked" on first seed to mirror
 *    the AI's recommendation, but the user has final say).
 *  - Each row exposes the original/suggested/custom radio AND an editable
 *    skills chip line that the AI proposes from the bullet's own keyword
 *    pool. The AI is forbidden from inventing new keywords; the user can edit
 *    the chip line freely after approval.
 *
 * Output to the parent: an array of ApprovedBulletRewrite-shaped objects,
 * one per AI edit, including unchecked ones (with `included=false`) so the
 * parent knows which rows the user deliberately turned OFF. The renderer
 * skips `included=false` rows.
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
      keywords: string[];
      included: boolean;
    }[],
  ) => void;
}

type Decision = {
  use: "original" | "suggested" | "custom";
  custom: string;
  keywordsCsv: string;
  included: boolean;
};

function initialDecisions(edits: SuggestedEdit[]): Record<string, Decision> {
  return Object.fromEntries(
    edits.map((e) => [
      e.targetId,
      {
        use: "suggested" as const,
        custom: e.suggested,
        keywordsCsv: (e.suggestedKeywords ?? []).join(", "),
        included: true,
      },
    ]),
  );
}

function parseChips(csv: string): string[] {
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function BulletPicker({ edits, experiences, onChange }: Props) {
  const initial = useMemo(() => initialDecisions(edits), [edits]);

  // Content-key re-seed guard — same pattern used by SkillsRanked /
  // CheckboxSectionPicker to stop the "Maximum update depth exceeded" loop
  // that bit Phase 3 when this component used a naive `useEffect([edits])`
  // resync.
  const seedKey = useMemo(
    () =>
      edits
        .map(
          (e) =>
            `${e.targetId}:${e.suggested}:${(e.suggestedKeywords ?? []).join("|")}`,
        )
        .join("||"),
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
      if (!d) {
        return {
          targetId: e.targetId,
          experienceId: e.experienceId,
          text: e.original,
          keywords: e.suggestedKeywords ?? [],
          included: true,
        };
      }
      const text =
        d.use === "original"
          ? e.original
          : d.use === "suggested"
            ? e.suggested
            : d.custom;
      return {
        targetId: e.targetId,
        experienceId: e.experienceId,
        text,
        keywords: parseChips(d.keywordsCsv),
        included: d.included,
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
              if (!d) return null;
              return (
                <div
                  key={e.targetId}
                  className={`rounded-lg border p-3 shadow-sm ${
                    d.included
                      ? "border-brand/40 bg-white"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="mb-2 flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={d.included}
                      onChange={() =>
                        setDecision(e.targetId, { included: !d.included })
                      }
                      className="mt-1"
                      aria-label="Include this bullet"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-mono text-slate-400">
                          {e.targetId}
                        </span>
                      </div>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <label className="flex items-start gap-2 rounded bg-slate-50 p-2 text-sm">
                          <input
                            type="radio"
                            name={`use-${e.targetId}`}
                            checked={d.use === "original"}
                            onChange={() =>
                              setDecision(e.targetId, { use: "original" })
                            }
                            className="mt-1"
                            disabled={!d.included}
                          />
                          <div>
                            <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                              Original
                            </div>
                            <div className="text-slate-700">{e.original}</div>
                          </div>
                        </label>
                        <label className="flex items-start gap-2 rounded bg-brand/5 p-2 text-sm">
                          <input
                            type="radio"
                            name={`use-${e.targetId}`}
                            checked={d.use === "suggested"}
                            onChange={() =>
                              setDecision(e.targetId, { use: "suggested" })
                            }
                            className="mt-1"
                            disabled={!d.included}
                          />
                          <div>
                            <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                              AI suggestion
                            </div>
                            <div className="text-slate-800">{e.suggested}</div>
                            {e.rationale && (
                              <div className="mt-1 text-[10px] italic text-slate-500">
                                Why: {e.rationale}
                              </div>
                            )}
                          </div>
                        </label>
                      </div>
                      <label className="mt-2 block">
                        <div className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-600">
                          <input
                            type="radio"
                            name={`use-${e.targetId}`}
                            checked={d.use === "custom"}
                            onChange={() =>
                              setDecision(e.targetId, { use: "custom" })
                            }
                            disabled={!d.included}
                          />
                          Custom edit
                        </div>
                        <textarea
                          rows={2}
                          value={d.custom}
                          onChange={(ev) =>
                            setDecision(e.targetId, {
                              use: "custom",
                              custom: ev.target.value,
                            })
                          }
                          disabled={!d.included}
                          className="w-full rounded border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-100"
                        />
                      </label>
                      <label className="mt-2 block">
                        <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                          Skills line (comma-separated, rendered italic below
                          the bullet)
                        </div>
                        <input
                          type="text"
                          value={d.keywordsCsv}
                          onChange={(ev) =>
                            setDecision(e.targetId, {
                              keywordsCsv: ev.target.value,
                            })
                          }
                          disabled={!d.included}
                          placeholder="e.g. Python, Pandas, Airflow"
                          className="w-full rounded border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-100"
                        />
                      </label>
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
