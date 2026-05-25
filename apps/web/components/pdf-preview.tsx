"use client";

import { useEffect, useMemo, useState } from "react";

interface Props {
  base64: string;
  filename: string;
  meta?: string;
  /**
   * Phase 1 page-length check is intentionally cosmetic: we cannot count PDF
   * pages from base64 without pulling in a parser. Instead, the route handler
   * (when implemented) will populate `pageCount`; the user makes the final
   * call visually. If `pageCount` is provided and > 1, we show a soft warning.
   */
  pageCount?: number;
}

export function PDFPreview({ base64, filename, meta, pageCount }: Props) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  const blob = useMemo(() => {
    const bin = atob(base64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: "application/pdf" });
  }, [base64]);

  useEffect(() => {
    const url = URL.createObjectURL(blob);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  function download() {
    if (!objectUrl) return;
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    a.click();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="font-medium text-slate-800">{filename}</span>
        {meta && <span className="text-xs text-slate-500">{meta}</span>}
        <button
          onClick={download}
          className="ml-auto rounded-md border border-slate-300 px-3 py-1 text-xs hover:bg-slate-100"
        >
          Download
        </button>
      </div>

      {pageCount !== undefined && pageCount > 1 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Heads-up: this PDF appears to span {pageCount} pages. Visually verify before sending.
        </div>
      )}

      {objectUrl ? (
        <iframe
          src={objectUrl}
          title={filename}
          className="h-[820px] w-full rounded-md border border-slate-200 bg-white shadow-sm"
        />
      ) : (
        <div className="h-[820px] w-full animate-pulse rounded-md border border-slate-200 bg-slate-100" />
      )}
    </div>
  );
}
