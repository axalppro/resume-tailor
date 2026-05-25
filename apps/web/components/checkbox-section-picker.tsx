"use client";

import { useState } from "react";
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
 */
export function CheckboxSectionPicker({ recommendations, onChange }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(recommendations.map((r) => [r.blockId, r.recommendedDefault])),
  );

  const groups = groupBy(recommendations, (r) => r.blockType);

  function toggle(id: string) {
    setChecked((c) => {
      const next = { ...c, [id]: !c[id] };
      onChange?.(Object.entries(next).filter(([, v]) => v).map(([k]) => k));
      return next;
    });
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
