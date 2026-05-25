"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { BlockRecommendation } from "@resume-tailor/shared-types";

interface Props {
  recommendations: BlockRecommendation[];
  onChange?: (selectedBlockIds: string[]) => void;
}

/**
 * CheckboxSectionPicker — the centerpiece of the manual approval step.
 *
 * Shows every recommended ContentBlock as a checkbox, grouped by type. AI's
 * `recommendedDefault` only seeds the initial checked state; the user has
 * full control from there.
 *
 * --- React safety note ---------------------------------------------------
 * Previous revision called `onChange` from *inside* the `setChecked` updater,
 * which React (correctly) flagged with:
 *
 *   "Cannot update a component (TailoringSession) while rendering a
 *    different component (CheckboxSectionPicker)"
 *
 * Updater functions are allowed to run during render (strict-mode double
 * invoke, concurrent rendering, etc.). Triggering a parent setState from
 * there interleaves two renders. The fix is to mutate local state in the
 * handler and emit `onChange` from a useEffect that fires after commit —
 * the same pattern the sibling live-edit components use.
 *
 * As a bonus this also fixes a latent bug: the parent never received the
 * initial set of `recommendedDefault: true` blocks until the user toggled
 * something. Now the effect runs once on mount and the parent sees the
 * defaults immediately.
 */
export function CheckboxSectionPicker({ recommendations, onChange }: Props) {
  // Re-seed when the recommendations list *content* changes (e.g. user clicks
  // "Re-tailor"). We key by the joined blockId+default string so that re-using
  // the same recommendations array under a fresh object reference does NOT
  // wipe the user's selections — that was a `Maximum update depth exceeded`
  // trap because the parent (TailoringSession) re-creates the recoBlocks array
  // on every state change during the recommended-mode pipeline.
  const initial = useMemo<Record<string, boolean>>(
    () => Object.fromEntries(recommendations.map((r) => [r.blockId, r.recommendedDefault])),
    [recommendations],
  );
  const seedKey = useMemo(
    () => recommendations.map((r) => `${r.blockId}:${r.recommendedDefault ? 1 : 0}`).join("|"),
    [recommendations],
  );
  const [checked, setChecked] = useState<Record<string, boolean>>(initial);
  const lastSeedKey = useRef(seedKey);

  useEffect(() => {
    if (lastSeedKey.current === seedKey) return;
    lastSeedKey.current = seedKey;
    setChecked(initial);
  }, [seedKey, initial]);

  useEffect(() => {
    onChange?.(
      Object.entries(checked)
        .filter(([, v]) => v)
        .map(([k]) => k),
    );
    // We intentionally omit `onChange` from deps. Parents commonly pass an
    // inline arrow on every render; including it would create a feedback
    // loop where every parent re-render bumps the effect → calls onChange
    // → triggers another parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checked]);

  const groups = groupBy(recommendations, (r) => r.blockType);

  function toggle(id: string) {
    setChecked((c) => ({ ...c, [id]: !c[id] }));
  }

  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([type, items]) => (
        <section key={type}>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            {prettyType(type)}
          </h3>
          <ul className="space-y-1">
            {items.map((r) => (
              <li
                key={r.blockId}
                className="flex items-start gap-3 rounded-md border border-slate-200 bg-white p-3 shadow-sm"
              >
                <input
                  type="checkbox"
                  checked={!!checked[r.blockId]}
                  onChange={() => toggle(r.blockId)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-800">{r.title}</span>
                    <span className="text-[10px] text-slate-400">priority {r.priority}</span>
                  </div>
                  <p className="text-xs text-slate-500">{r.reason}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function groupBy<T, K extends string>(arr: T[], key: (t: T) => K): Record<K, T[]> {
  return arr.reduce(
    (acc, x) => {
      const k = key(x);
      (acc[k] ??= []).push(x);
      return acc;
    },
    {} as Record<K, T[]>,
  );
}

function prettyType(type: string): string {
  return type.replace(/_/g, " ");
}
