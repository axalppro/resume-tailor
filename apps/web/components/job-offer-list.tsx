"use client";

/**
 * JobOfferList \u2014 Phase 3 dashboard history view.
 *
 * Replaces the Phase 2 "Recent generated resumes" list. Each row represents
 * one job offer with: title, company, last-session status badge, PDF count,
 * an "Open" link to the offer page, and a delete button.
 *
 * The component is a client component because it owns the delete action +
 * optimistic removal; data is passed in from the server-rendered dashboard.
 */
import { useState } from "react";
import Link from "next/link";

export interface JobOfferRow {
  id: string;
  title: string;
  company: string;
  createdAt: string | Date;
  parsed: boolean;
  generatedCount: number;
  sessionCount: number;
  latestSession: {
    id: string;
    status: string;
    updatedAt: string | Date;
  } | null;
}

interface Props {
  initial: JobOfferRow[];
}

function StatusBadge({ row }: { row: JobOfferRow }) {
  // The status pipeline is driven by the latest TailoringSession; if no
  // session exists yet we fall back to the parsed/raw state of the offer.
  const status = row.latestSession?.status ?? (row.parsed ? "parsed" : "new");
  const palette: Record<string, string> = {
    new: "bg-slate-100 text-slate-700 border-slate-200",
    parsed: "bg-sky-100 text-sky-800 border-sky-200",
    draft: "bg-amber-100 text-amber-800 border-amber-200",
    approved: "bg-indigo-100 text-indigo-800 border-indigo-200",
    rendered: "bg-emerald-100 text-emerald-800 border-emerald-200",
  };
  const cls = palette[status] ?? palette.new;
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      {status}
    </span>
  );
}

export function JobOfferList({ initial }: Props) {
  const [rows, setRows] = useState<JobOfferRow[]>(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(row: JobOfferRow) {
    const ok = window.confirm(
      `Delete "${row.title}" at ${row.company}?\n\n` +
        `This permanently removes the job offer, ${row.sessionCount} tailoring ` +
        `session(s), and ${row.generatedCount} generated PDF(s).`,
    );
    if (!ok) return;

    setBusyId(row.id);
    setError(null);

    // Optimistic removal \u2014 restore on failure.
    const snapshot = rows;
    setRows((prev) => prev.filter((r) => r.id !== row.id));

    try {
      const res = await fetch(`/api/job-offers/${row.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Delete failed");
    } catch (err) {
      setRows(snapshot);
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <p className="mt-3 text-sm text-slate-500">
        No job offers yet. Click <strong>+ New job offer</strong> to paste one in.
      </p>
    );
  }

  return (
    <div className="mt-3">
      {error && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          {error}
        </div>
      )}
      <ul className="divide-y divide-slate-100">
        {rows.map((r) => {
          const date =
            typeof r.createdAt === "string"
              ? new Date(r.createdAt)
              : r.createdAt;
          return (
            <li
              key={r.id}
              className="flex flex-wrap items-center gap-3 py-2.5 text-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/jobs/${r.id}`}
                    className="truncate font-medium text-brand hover:underline"
                  >
                    {r.title}
                  </Link>
                  <StatusBadge row={r} />
                </div>
                <div className="mt-0.5 truncate text-xs text-slate-500">
                  {r.company} {"·"} {date.toLocaleString()} {"·"}{" "}
                  {r.generatedCount} PDF{r.generatedCount === 1 ? "" : "s"}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/jobs/${r.id}`}
                  className="rounded-md border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-100"
                >
                  Open
                </Link>
                <button
                  onClick={() => handleDelete(r)}
                  disabled={busyId === r.id}
                  className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs text-red-700 hover:bg-red-100 disabled:opacity-50"
                >
                  {busyId === r.id ? "Deleting\u2026" : "Delete"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
