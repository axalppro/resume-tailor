"use client";

import { useState } from "react";

interface Props {
  /** Called when a job-offer record has been created in the DB. */
  onCreated?: (id: string, title: string, company: string) => void;
}

/**
 * Phase 1 stub. Allows pasting (or uploading a .txt file) a job offer and
 * persists it via POST /api/job-offers. Real parsing and tailoring is wired
 * in Phase 2.
 */
export function JobOfferUpload({ onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [rawText, setRawText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function handleFile(file: File) {
    const text = await file.text();
    setRawText(text);
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch("/api/job-offers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, company, rawText, source: "paste" }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Failed");
      setOk(`Saved: ${json.offer.title}`);
      onCreated?.(json.offer.id, json.offer.title, json.offer.company);
      setRawText("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Job title"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          required
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Company"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <textarea
        required
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        placeholder="Paste the job description here…"
        rows={10}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
      />
      <div className="flex items-center gap-3">
        <input
          type="file"
          accept=".txt,.md"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="text-xs"
        />
        <button
          type="submit"
          disabled={busy}
          className="ml-auto rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save job offer"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {ok && <p className="text-xs text-emerald-600">{ok}</p>}
    </form>
  );
}
