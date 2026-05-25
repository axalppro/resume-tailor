"use client";

import { useState } from "react";
import { PDFPreview } from "./pdf-preview";

interface SampleResponse {
  ok: boolean;
  filename?: string;
  pdfBase64?: string;
  bytes?: number;
  compileMs?: number;
  error?: string;
  stderr?: string;
}

export function SamplePdfButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SampleResponse | null>(null);

  async function run() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/sample-pdf", { method: "POST" });
      const json: SampleResponse = await res.json();
      setResult(json);
    } catch (err) {
      setResult({ ok: false, error: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={run}
        disabled={loading}
        className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-50"
      >
        {loading ? "Compiling…" : "Generate sample PDF"}
      </button>

      {result && !result.ok && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <div className="font-medium">Compile failed</div>
          <div>{result.error}</div>
          {result.stderr && (
            <pre className="mt-2 max-h-48 overflow-auto rounded bg-red-100 p-2 text-[10px]">
              {result.stderr}
            </pre>
          )}
        </div>
      )}

      {result?.ok && result.pdfBase64 && (
        <PDFPreview
          base64={result.pdfBase64}
          filename={result.filename ?? "resume.pdf"}
          meta={`${result.bytes} bytes · ${result.compileMs} ms`}
        />
      )}
    </div>
  );
}
