"use client";

/**
 * CapabilitiesRanked — manual capability picker with up/down reordering.
 *
 * AI proposes a ranked list of capability bullets (the `suggestions` prop);
 * each row has a checkbox plus ↑/↓ buttons. The output is the array of
 * SELECTED bullets in the user's chosen order. The user can also paste their
 * own free-form bullets at the bottom.
 *
 * Whitelist note: capabilities are an AI-editable field, but the AI is only
 * allowed to *rephrase or rank* — not invent. The bullets shown here all came
 * from the master resume's `capability_pool`. The user is the final arbiter.
 */
import { useEffect, useMemo, useRef, useState } from "react";

export interface CapabilitySuggestion {
  id: string;
  text: string;
  rationale: string;
}

interface Props {
  suggestions: CapabilitySuggestion[];
  /** Maximum capabilities that fit on a single page — soft cap, just a hint. */
  recommendedMax?: number;
  onChange?: (ordered: { id: string; text: string }[]) => void;
}

interface Row {
  id: string;
  text: string;
  rationale: string;
  checked: boolean;
}

export function CapabilitiesRanked({
  suggestions,
  recommendedMax = 6,
  onChange,
}: Props) {
  const initial = useMemo<Row[]>(
    () =>
      suggestions.map((s, i) => ({
        id: s.id,
        text: s.text,
        rationale: s.rationale,
        checked: i < recommendedMax,
      })),
    [suggestions, recommendedMax],
  );
  // Stable content key — re-seed only when the suggestions actually change,
  // not on every parent re-render that hands us a fresh array reference.
  // Same `Maximum update depth exceeded` trap as DirectivesEditor and
  // CheckboxSectionPicker had: parent (TailoringSession) re-builds its
  // capability-suggestions array on every state tick.
  const seedKey = useMemo(
    () => `${recommendedMax}|${suggestions.map((s) => `${s.id}:${s.text}`).join("|")}`,
    [suggestions, recommendedMax],
  );
  const [rows, setRows] = useState<Row[]>(initial);
  const lastSeedKey = useRef(seedKey);

  useEffect(() => {
    if (lastSeedKey.current === seedKey) return;
    lastSeedKey.current = seedKey;
    setRows(initial);
  }, [seedKey, initial]);

  // Emit upward whenever selection or order changes.
  useEffect(() => {
    onChange?.(rows.filter((r) => r.checked).map((r) => ({ id: r.id, text: r.text })));
    // We intentionally omit `onChange` to avoid feedback loops when the parent
    // re-creates the callback on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  function toggle(id: string) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, checked: !r.checked } : r)));
  }

  function move(id: string, dir: -1 | 1) {
    setRows((rs) => {
      const idx = rs.findIndex((r) => r.id === id);
      const j = idx + dir;
      if (idx < 0 || j < 0 || j >= rs.length) return rs;
      const next = rs.slice();
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }

  const selectedCount = rows.filter((r) => r.checked).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          {selectedCount} selected
          {selectedCount > recommendedMax && (
            <span className="ml-1 text-amber-600">
              (over recommended {recommendedMax})
            </span>
          )}
        </span>
        <span>Use ↑/↓ to reorder. Order is preserved in the rendered PDF.</span>
      </div>

      <ul className="space-y-1">
        {rows.map((r, i) => (
          <li
            key={r.id}
            className={`flex items-start gap-2 rounded-md border p-2 text-sm shadow-sm ${
              r.checked ? "border-brand/40 bg-brand/5" : "border-slate-200 bg-white"
            }`}
          >
            <input
              type="checkbox"
              checked={r.checked}
              onChange={() => toggle(r.id)}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="text-slate-800">{r.text}</div>
              {r.rationale && (
                <div className="text-[10px] italic text-slate-500">
                  Why: {r.rationale}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => move(r.id, -1)}
                disabled={i === 0}
                className="rounded border border-slate-200 px-1 text-[10px] text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                aria-label="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(r.id, 1)}
                disabled={i === rows.length - 1}
                className="rounded border border-slate-200 px-1 text-[10px] text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                aria-label="Move down"
              >
                ↓
              </button>
            </div>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="text-xs text-slate-500">
            No capabilities suggested yet. Run "Tailor with AI" above.
          </li>
        )}
      </ul>
    </div>
  );
}
