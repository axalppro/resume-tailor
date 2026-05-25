"use client";

import { useState } from "react";
import type { SuggestedEdit } from "@resume-tailor/shared-types";

interface Props {
  edits: SuggestedEdit[];
  /** Returns the array of approved (final-text) edits keyed by targetId. */
  onApprove?: (approved: { targetId: string; text: string }[]) => void;
}

/**
 * Phase 1 stub for the AI edit review screen. Shows each suggested rewrite
 * side-by-side with the original. The user can accept the suggestion, keep
 * the original, or freely edit the text — there is no auto-apply.
 */
export function AIEditReview({ edits, onApprove }: Props) {
  const [decisions, setDecisions] = useState<
    Record<string, { use: "original" | "suggested" | "custom"; custom: string }>
  >(() =>
    Object.fromEntries(edits.map((e) => [e.targetId, { use: "suggested", custom: e.suggested }])),
  );

  function setDecision(id: string, patch: Partial<{ use: "original" | "suggested" | "custom"; custom: string }>) {
    setDecisions((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  }

  function approve() {
    const final = edits.map((e) => {
      const d = decisions[e.targetId];
      const text = d.use === "original" ? e.original : d.use === "suggested" ? e.suggested : d.custom;
      return { targetId: e.targetId, text };
    });
    onApprove?.(final);
  }

  return (
    <div className="space-y-4">
      {edits.length === 0 && (
        <p className="text-sm text-slate-500">No AI rewrites to review.</p>
      )}
      {edits.map((e) => {
        const d = decisions[e.targetId];
        return (
          <div key={e.targetId} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">{e.targetId}</span>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-500">{e.fieldType}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <input
                    type="radio"
                    name={`use-${e.targetId}`}
                    checked={d.use === "original"}
                    onChange={() => setDecision(e.targetId, { use: "original" })}
                  />
                  Original
                </label>
                <p className="rounded bg-slate-50 p-2 text-sm text-slate-700">{e.original}</p>
              </div>
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <input
                    type="radio"
                    name={`use-${e.targetId}`}
                    checked={d.use === "suggested"}
                    onChange={() => setDecision(e.targetId, { use: "suggested" })}
                  />
                  AI suggestion
                </label>
                <p className="rounded bg-brand/5 p-2 text-sm text-slate-800">{e.suggested}</p>
                <p className="text-[10px] italic text-slate-500">Why: {e.rationale}</p>
              </div>
            </div>
            <div className="mt-2">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <input
                  type="radio"
                  name={`use-${e.targetId}`}
                  checked={d.use === "custom"}
                  onChange={() => setDecision(e.targetId, { use: "custom" })}
                />
                Custom edit
              </label>
              <textarea
                rows={2}
                value={d.custom}
                onChange={(ev) => setDecision(e.targetId, { use: "custom", custom: ev.target.value })}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
              />
            </div>
          </div>
        );
      })}
      {edits.length > 0 && (
        <button
          onClick={approve}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          Approve selected edits
        </button>
      )}
    </div>
  );
}
