"use client";

import Link from "next/link";

interface Item {
  id: string;
  filename: string;
  createdAt: string | Date;
  jobOffer?: { title: string; company: string } | null;
}

/**
 * Phase 1 stub. Lists previously generated resume versions for a given
 * tailoring session or job offer. Phase 2/3 will add diff, duplicate, and
 * "promote to canonical" actions.
 */
export function VersionHistory({ items }: { items: Item[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">No previous versions yet.</p>;
  }
  return (
    <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
      {items.map((it) => (
        <li key={it.id} className="flex items-center justify-between gap-3 p-3 text-sm">
          <div>
            <Link href={`/resumes/${it.id}`} className="font-medium text-brand hover:underline">
              {it.filename}
            </Link>
            {it.jobOffer && (
              <div className="text-xs text-slate-500">
                {it.jobOffer.title} · {it.jobOffer.company}
              </div>
            )}
          </div>
          <span className="text-xs text-slate-400">
            {new Date(it.createdAt).toLocaleString()}
          </span>
        </li>
      ))}
    </ul>
  );
}
