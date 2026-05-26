"use client";

/**
 * SkillsRanked — Phase 3.5 picker for the AI-tailored Skills section.
 *
 * Differences from the old `CapabilitiesRanked`:
 *  - Each row renders a bold `title` plus a `details` line, both editable
 *    in-place. The AI proposes both; the user can override either.
 *  - The AI may NOT invent tools; the user MAY edit freely after approval —
 *    they are the final arbiter. The whitelist invariant (AI ≠ invent) is
 *    enforced earlier in the pipeline (prompt + provider).
 *  - Output to the parent is the array of selected `{ id, title, details }`
 *    in the user's chosen order (checkbox + ↑/↓ reorder).
 *
 * Backwards compatibility: if the input row only has `text` (legacy
 * `CapabilitySuggestion`), we display it in the title field and leave details
 * empty, so old sessions don't crash.
 */
import { useEffect, useMemo, useRef, useState } from "react";

export interface SkillSuggestion {
  id: string;
  /** New Phase 3.5 shape. */
  title?: string;
  details?: string;
  /** Legacy shape kept for old sessions. */
  text?: string;
  rationale?: string;
}

interface Props {
  suggestions: SkillSuggestion[];
  /** Maximum skills that fit on a single page — soft cap, just a hint. */
  recommendedMax?: number;
  onChange?: (
    ordered: { id: string; title: string; details: string }[],
  ) => void;
}

interface Row {
  id: string;
  title: string;
  details: string;
  rationale: string;
  checked: boolean;
}

function rowFromSuggestion(s: SkillSuggestion, checked: boolean): Row {
  // Prefer the new shape; fall back to legacy `text` in the title field so old
  // sessions remain visible until the user re-tailors.
  const title = s.title?.trim() || s.text?.trim() || "";
  return {
    id: s.id,
    title,
    details: s.details ?? "",
    rationale: s.rationale ?? "",
    checked,
  };
}

export function SkillsRanked({
  suggestions,
  recommendedMax = 6,
  onChange,
}: Props) {
  const initial = useMemo<Row[]>(
    () => suggestions.map((s, i) => rowFromSuggestion(s, i < recommendedMax)),
    [suggestions, recommendedMax],
  );

  // Content-keyed re-seed guard — see the equivalent comment block in
  // CapabilitiesRanked / CheckboxSectionPicker. Parents may hand us a new
  // array reference on every render; we must only re-seed when the underlying
  // suggestions actually changed.
  const seedKey = useMemo(
    () =>
      `${recommendedMax}|` +
      suggestions
        .map((s) => `${s.id}:${s.title ?? s.text ?? ""}:${s.details ?? ""}`)
        .join("|"),
    [suggestions, recommendedMax],
  );
  const [rows, setRows] = useState<Row[]>(initial);
  const lastSeedKey = useRef(seedKey);

  useEffect(() => {
    if (lastSeedKey.current === seedKey) return;
    lastSeedKey.current = seedKey;
    setRows(initial);
  }, [seedKey, initial]);

  // Emit upward on any change.
  useEffect(() => {
    onChange?.(
      rows
        .filter((r) => r.checked)
        .map((r) => ({ id: r.id, title: r.title, details: r.details })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  function toggle(id: string) {
    setRows((rs) =>
      rs.map((r) => (r.id === id ? { ...r, checked: !r.checked } : r)),
    );
  }

  function updateField(id: string, patch: Partial<Pick<Row, "title" | "details">>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
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
        <span>
          Use ↑/↓ to reorder. Title is shown bold; details follow on the same
          line in the PDF.
        </span>
      </div>

      <ul className="space-y-1.5">
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
              className="mt-1.5"
            />
            <div className="flex-1 space-y-1">
              <input
                type="text"
                value={r.title}
                onChange={(ev) => updateField(r.id, { title: ev.target.value })}
                placeholder="Title (1–3 words, will render bold)"
                className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-sm font-semibold text-slate-900 focus:border-brand focus:outline-none"
              />
              <input
                type="text"
                value={r.details}
                onChange={(ev) => updateField(r.id, { details: ev.target.value })}
                placeholder="Details (one concise sentence with concrete tools / domains)"
                className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 focus:border-brand focus:outline-none"
              />
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
            No skills suggested yet. Run &ldquo;Tailor with AI&rdquo; above.
          </li>
        )}
      </ul>
    </div>
  );
}
