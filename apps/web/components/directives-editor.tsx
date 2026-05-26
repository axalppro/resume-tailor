"use client";

/**
 * DirectivesEditor \u2014 Phase 3 shared editor for user-authored tailoring
 * directives. Used both on the Settings page (global / always-on) and on the
 * job-offer detail page (per-job overlay).
 *
 * Contract:
 *   - Renders four bounded textareas (summary / capabilities / bullets / general).
 *   - Calls PATCH on the provided endpoint when the user clicks "Save".
 *   - Stays fully manual \u2014 nothing autosaves \u2014 to match the project-wide
 *     "manual-first" invariant.
 *
 * The endpoint accepts either { directives: {...} } or a bare {...} payload;
 * we use the bare form since that's what /api/master-resume/default/directives
 * and /api/job-offers/[jobId]/directives also expose.
 */
import { useState } from "react";
import type { Directives } from "@resume-tailor/shared-types";

interface Props {
  /** PATCH endpoint that accepts a Directives JSON body. */
  endpoint: string;
  /** Initial value, typically fetched server-side and passed in. */
  initial?: Directives | null;
  /** Heading shown above the editor (e.g. "Global directives"). */
  title: string;
  /** Optional helper text shown below the heading. */
  description?: string;
}

const FIELDS: Array<{
  key: keyof Directives;
  label: string;
  placeholder: string;
}> = [
  {
    key: "summary",
    label: "Summary",
    placeholder:
      "e.g. Start with a 1-sentence personality hook. Keep tone warm but concise.",
  },
  {
    key: "capabilities",
    label: "Capabilities",
    placeholder:
      "e.g. Prioritise hands-on engineering verbs. Avoid buzzwords like \u201csynergy\u201d.",
  },
  {
    key: "bullets",
    label: "Experience bullets",
    placeholder:
      "e.g. Lead with outcome / metric whenever possible. Keep each bullet under 25 words.",
  },
  {
    key: "general",
    label: "General",
    placeholder:
      "e.g. I write in British English. Prefer \u201ccollaborated\u201d over \u201cpartnered with\u201d.",
  },
];

export function DirectivesEditor({ endpoint, initial, title, description }: Props) {
  // Seed local state once at mount from the server-provided `initial` prop.
  // We deliberately do NOT resync from `initial` later: the parent is a server
  // component that re-renders on every navigation, so a `useEffect([initial])`
  // would receive a fresh object reference on each parent re-render even when
  // the underlying directives are unchanged, fighting the user's edits and —
  // in combination with Next 15's RSC refresh after a sibling client fetch —
  // produced a setState-in-effect loop that crashed the page.
  const [values, setValues] = useState<Directives>({
    summary: initial?.summary ?? "",
    capabilities: initial?.capabilities ?? "",
    bullets: initial?.bullets ?? "",
    general: initial?.general ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update(key: keyof Directives, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }));
    // Only clear a stale success message if one is showing — avoids an extra
    // re-render on every keystroke when nothing is queued.
    setMessage((m) => (m === null ? m : null));
  }

  async function save() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      // Strip whitespace-only fields so the DB doesn't fill up with empty
      // strings \u2014 the merge helper treats them as absent anyway, but null is
      // cleaner to introspect.
      const payload: Directives = {};
      for (const f of FIELDS) {
        const v = (values[f.key] ?? "").trim();
        if (v.length > 0) payload[f.key] = v;
      }
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Save failed");
      setMessage("Saved.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        )}
        <p className="mt-1 text-[11px] text-slate-400">
          Style guidance only. The AI ignores any directive that would require
          inventing facts not present in your master resume.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <label key={f.key} className="block text-xs">
            <span className="mb-1 block font-medium text-slate-700">{f.label}</span>
            <textarea
              value={values[f.key] ?? ""}
              onChange={(e) => update(f.key, e.target.value)}
              placeholder={f.placeholder}
              rows={4}
              className="w-full resize-y rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs leading-snug text-slate-800 shadow-inner focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-3 justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {saving ? "Saving\u2026" : "Save directives"}
        </button>
        {message && <span className="text-xs text-emerald-600">{message}</span>}
        {error && <span className="text-xs text-red-600">Error: {error}</span>}
      </div>
    </section>
  );
}
