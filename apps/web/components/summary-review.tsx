"use client";

/**
 * SummaryReview — single-field variant of AIEditReview, specialised for the
 * resume summary. Shows original / AI-suggested / custom side-by-side with
 * radio selection. Emits the final approved text.
 */
import { useEffect, useState } from "react";

interface Props {
  original: string;
  suggested: string;
  /** Optional explanation from the model for transparency. */
  rationale?: string;
  onChange?: (approvedText: string) => void;
}

export function SummaryReview({ original, suggested, rationale, onChange }: Props) {
  const [choice, setChoice] = useState<"original" | "suggested" | "custom">("suggested");
  const [custom, setCustom] = useState<string>(suggested);

  useEffect(() => {
    const final = choice === "original" ? original : choice === "suggested" ? suggested : custom;
    onChange?.(final);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choice, custom, original, suggested]);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
          <input
            type="radio"
            name="summary-choice"
            checked={choice === "original"}
            onChange={() => setChoice("original")}
            className="mt-1"
          />
          <div>
            <div className="text-xs font-medium text-slate-600">Original</div>
            <div className="text-slate-700">{original}</div>
          </div>
        </label>
        <label className="flex items-start gap-2 rounded-md border border-brand/30 bg-brand/5 p-3 text-sm">
          <input
            type="radio"
            name="summary-choice"
            checked={choice === "suggested"}
            onChange={() => setChoice("suggested")}
            className="mt-1"
          />
          <div>
            <div className="text-xs font-medium text-slate-600">AI suggestion</div>
            <div className="text-slate-800">{suggested}</div>
            {rationale && (
              <div className="mt-1 text-[10px] italic text-slate-500">
                Why: {rationale}
              </div>
            )}
          </div>
        </label>
      </div>
      <label className="block rounded-md border border-slate-200 bg-white p-3 text-sm">
        <div className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-600">
          <input
            type="radio"
            name="summary-choice"
            checked={choice === "custom"}
            onChange={() => setChoice("custom")}
          />
          Custom edit
        </div>
        <textarea
          rows={3}
          value={custom}
          onChange={(e) => {
            setCustom(e.target.value);
            setChoice("custom");
          }}
          className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
        />
      </label>
    </div>
  );
}
