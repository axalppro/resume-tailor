export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold text-brand-dark">Settings</h1>
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
        <p className="text-slate-600">
          Phase 1 has no settings to tweak. Configuration lives in{" "}
          <code>.env</code> (database URL, compiler URL, AI provider). Phase 3
          will surface a UI here for AI provider keys, prompt-version pinning,
          and storage backend selection.
        </p>
      </div>
    </div>
  );
}
