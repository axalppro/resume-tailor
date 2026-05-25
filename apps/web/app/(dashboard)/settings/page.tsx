/**
 * Settings page \u2014 Phase 3.
 *
 * Surfaces the global, always-on tailoring directives stored on the default
 * MasterResumeProfile. The directives are loaded server-side (Prisma) and
 * passed to the client `<DirectivesEditor>` so the initial paint already
 * shows the current values.
 */
import { parseDirectives } from "@resume-tailor/shared-types";
import { prisma } from "@/lib/db";
import { DirectivesEditor } from "@/components/directives-editor";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  let profile: { id: string; directives: unknown } | null = null;
  let dbError: string | null = null;

  try {
    profile = await prisma.masterResumeProfile.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true, directives: true },
    });
  } catch (err) {
    dbError = (err as Error).message;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold text-brand-dark">Settings</h1>

      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
        <p className="text-slate-600">
          Provider configuration lives in <code>apps/web/.env</code>:{" "}
          <code>AI_PROVIDER</code> (mock | anthropic | ollama | perplexity),
          plus the corresponding API key or local URL. The dashboard footer
          shows the active provider.
        </p>
      </div>

      {dbError && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          DB not reachable: {dbError}. Run <code>pnpm docker:up</code> +{" "}
          <code>pnpm db:migrate &amp;&amp; pnpm db:seed</code>.
        </div>
      )}

      {!dbError && !profile && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          No master resume profile seeded yet. Run <code>pnpm db:seed</code>.
        </div>
      )}

      {profile && (
        <DirectivesEditor
          endpoint="/api/master-resume/default/directives"
          initial={parseDirectives(profile.directives)}
          title="Global tailoring directives"
          description="These directives are injected into every AI tailoring call as style guidance. Per-job directives on a job-offer page override these when set."
        />
      )}
    </div>
  );
}
