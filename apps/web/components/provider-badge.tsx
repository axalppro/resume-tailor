"use client";

/**
 * ProviderBadge — small footer chip that displays the currently-active
 * AI provider and model. Pulls from /api/provider-info on mount so it
 * always reflects the running configuration (not the build-time env).
 */
import { useEffect, useState } from "react";

interface ProviderInfo {
  ok: boolean;
  provider: string;
  model?: string;
  error?: string;
}

export function ProviderBadge() {
  const [info, setInfo] = useState<ProviderInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/provider-info", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: ProviderInfo) => {
        if (!cancelled) setInfo(j);
      })
      .catch(() => {
        if (!cancelled) setInfo({ ok: false, provider: "unknown" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!info) {
    return <span className="text-slate-400">Provider: …</span>;
  }

  const tone = info.ok
    ? "border-slate-200 bg-slate-100 text-slate-600"
    : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${tone}`}
      title={info.error ?? `Provider: ${info.provider}${info.model ? ` (${info.model})` : ""}`}
    >
      <span className="font-medium">{info.provider}</span>
      {info.model && <span className="text-slate-400">·</span>}
      {info.model && <span className="font-mono text-[10px]">{info.model}</span>}
      {!info.ok && <span className="ml-1">!</span>}
    </span>
  );
}
