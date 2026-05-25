/**
 * Dashboard page \u2014 Phase 3.
 *
 * The Phase 2 "Recent generated resumes" list is replaced by a job-offer
 * history view (one row per JobOffer). Each row carries the latest-session
 * status, PDF count, open/delete actions. Version history per offer still
 * lives on the job-offer detail page.
 */
import { SamplePdfButton } from "@/components/sample-pdf-button";
import { JobOfferList, type JobOfferRow } from "@/components/job-offer-list";
import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Touch the DB but degrade gracefully if it isn't running yet so the page
  // still renders during first-time setup.
  let profileCount = 0;
  let blockCount = 0;
  let totalPdfs = 0;
  let rows: JobOfferRow[] = [];
  let dbError: string | null = null;

  try {
    const [pc, bc, pdfs, offers] = await Promise.all([
      prisma.masterResumeProfile.count(),
      prisma.contentBlock.count(),
      prisma.generatedResume.count(),
      prisma.jobOffer.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          _count: { select: { generatedResumes: true, tailoringSessions: true } },
          tailoringSessions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { id: true, status: true, updatedAt: true },
          },
        },
      }),
    ]);
    profileCount = pc;
    blockCount = bc;
    totalPdfs = pdfs;
    rows = offers.map((o) => ({
      id: o.id,
      title: o.title,
      company: o.company,
      createdAt: o.createdAt,
      parsed: o.signals !== null,
      generatedCount: o._count.generatedResumes,
      sessionCount: o._count.tailoringSessions,
      latestSession: o.tailoringSessions[0]
        ? {
            id: o.tailoringSessions[0].id,
            status: o.tailoringSessions[0].status,
            updatedAt: o.tailoringSessions[0].updatedAt,
          }
        : null,
    }));
  } catch (err) {
    dbError = (err as Error).message;
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-brand-dark">Resume Tailor</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Paste a job offer, let the AI extract its signals, review every
          suggested edit, then generate a one-page PDF. Default provider is the
          deterministic mock \u2014 set <code>AI_PROVIDER</code> in{" "}
          <code>apps/web/.env</code> to switch to anthropic, ollama, or perplexity.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            href="/jobs/new"
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
          >
            + New job offer
          </Link>
          <SamplePdfButton />
          <span className="text-xs text-slate-500">
            (sample PDF still works as an end-to-end pipeline smoke test)
          </span>
        </div>
        {dbError && (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            DB not reachable yet: {dbError}. Run <code>pnpm docker:up</code> and{" "}
            <code>pnpm db:migrate &amp;&amp; pnpm db:seed</code>.
          </p>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card label="Master profiles" value={profileCount} />
        <Card label="Content blocks" value={blockCount} />
        <Card label="Generated PDFs" value={totalPdfs} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Job offers</h2>
          <Link href="/jobs/new" className="text-sm text-brand hover:underline">
            + New job offer
          </Link>
        </div>
        <JobOfferList initial={rows} />
      </section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}
