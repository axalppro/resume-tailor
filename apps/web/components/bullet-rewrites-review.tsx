"use client";

/**
 * BulletRewritesReview — live variant of <AIEditReview/> with no submit
 * button. Each row is original / AI / custom; `onChange` fires every time
 * any decision flips so the parent can stash state for the eventual
 * "Save draft" / "Generate PDF" buttons in the page footer.
 *
 * Why a separate component (not reuse AIEditReview directly): AIEditReview was
 * Phase-1 designed with its own "Approve selected edits" button — semantically
 * a sub-form. Phase-2's single-page flow doesn't want sub-forms; the footer
 * owns submission.
 */
import { useEffect, useState } from "react";
import type { SuggestedEdit } from "@resume-tailor/shared-types";

interface Props {
  edits: SuggestedEdit[];
  onChange?: (approved: { targetId: string; text: string }[]) => void;
}

type Decision = { use: "original" | "suggested" | "custom"; custom: string };

export function BulletRewritesReview({ edits, onChange }: Props) {
  const [decisions, setDecisions] = useState<Record<string, Decision>>(() =>
    Object.fromEntries(
      edits.map((e) => [e.targetId, { use: "suggested" as const, custom: e.suggested }]),
    ),
  );

  // Re-seed when the set of edits changes.
  useEffect(() => {
    setDecisions(
      Object.fromEntries(
        edits.map((e) => [e.targetId, { use: "suggested" as const, custom: e.suggested }]),
      ),
    );
  }, [edits]);

  useEffect(() => {
    const final = edits.map((e) => {
      const d = decisions[e.targetId];
      if (!d) return { targetId: e.targetId, text: e.original };
      const text =
        d.use === "original" ? e.original : d.use === "suggested" ? e.suggested : d.custom;
      return { targetId: e.targetId, text };
    });
    onChange?.(final);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decisions, edits]);

  function setDecision(id: string, patch: Partial<Decision>) {
    setDecisions((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  }

  if (edits.length === 0) {
    return <p className="text-sm text-slate-500">No bullet rewrites suggested.</p>;
  }

  return (
    <div className="space-y-3">
      {edits.map((e) => {
        const d = decisions[e.targetId];
        if (!d) return null;
        return (
          <div
            key={e.targetId}
            className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
          >
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-mono text-slate-500">{e.targetId}</span>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-500">
                {e.fieldType}
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex items-start gap-2 rounded bg-slate-50 p-2 text-sm">
                <input
                  type="radio"
                  name={`use-${e.targetId}`}
                  checked={d.use === "original"}
                  onChange={() => setDecision(e.targetId, { use: "original" })}
                  className="mt-1"
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
                  onChange={() => setDecision(e.targetId, { use: "suggested" })}
                  className="mt-1"
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
                  onChange={() => setDecision(e.targetId, { use: "custom" })}
                />
                Custom edit
              </div>
              <textarea
                rows={2}
                value={d.custom}
                onChange={(ev) =>
                  setDecision(e.targetId, { use: "custom", custom: ev.target.value })
                }
                className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
              />
            </label>
          </div>
        );
      })}
    </div>
  );
}
