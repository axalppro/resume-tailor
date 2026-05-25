export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold text-brand-dark">Settings</h1>
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
        <p className="text-slate-600">
          Configuration currently lives in <code>apps/web/.env</code>:
          database URL, compiler URL, and the AI provider selector
          (<code>AI_PROVIDER=mock | anthropic</code>,{" "}
          <code>ANTHROPIC_API_KEY</code>, <code>AI_MODEL</code>). Phase 3 will
          surface a UI here for provider keys, prompt-version pinning, and
          storage backend selection.
        </p>
      </div>
    </div>
  );
}
