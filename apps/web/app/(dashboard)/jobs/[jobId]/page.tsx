/**
 * Job-offer detail page — Phase 2 tailoring session host.
 *
 * Server component fetches the job offer, the latest TailoringSession (if any),
 * the canonical MasterResumeProfile, and previously generated resumes for this
 * offer. It then mounts the interactive <TailoringSession/> client component.
 */
import { notFound } from "next/navigation";
import { MasterResumeSchema } from "@resume-tailor/shared-types";
import { prisma } from "@/lib/db";
import { TailoringSession } from "@/components/tailoring-session";
import { VersionHistory } from "@/components/version-history";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function JobOfferPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;

  const [offer, profile, latestSession, generated] = await Promise.all([
    prisma.jobOffer.findUnique({ where: { id: jobId } }),
    prisma.masterResumeProfile.findFirst({ orderBy: { createdAt: "asc" } }),
    prisma.tailoringSession.findFirst({
      where: { jobOfferId: jobId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.generatedResume.findMany({
      where: { jobOfferId: jobId },
      orderBy: { createdAt: "desc" },
      select: { id: true, filename: true, createdAt: true },
    }),
  ]);

  if (!offer) notFound();

  if (!profile) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-brand-dark">{offer.title}</h1>
        <p className="text-sm text-slate-600">{offer.company}</p>
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          No master resume profile is seeded yet. Run{" "}
          <code>pnpm db:seed</code> first, then refresh this page.
        </div>
      </div>
    );
  }

  const master = MasterResumeSchema.parse(profile.data);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand-dark">{offer.title}</h1>
          <p className="text-sm text-slate-600">{offer.company}</p>
        </div>
        <Link
          href="/jobs/new"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-100"
        >
          + New job offer
        </Link>
      </header>

      <TailoringSession
        jobOffer={{
          id: offer.id,
          title: offer.title,
          company: offer.company,
          rawText: offer.rawText,
          signals: offer.signals as unknown,
        }}
        masterResumeId={profile.id}
        master={master}
        initialSession={
          latestSession
            ? {
                id: latestSession.id,
                status: latestSession.status,
                suggestions: latestSession.suggestions as unknown,
                approved: latestSession.approved as unknown,
              }
            : null
        }
      />

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Version history
        </h2>
        <VersionHistory
          items={generated.map((g) => ({
            id: g.id,
            filename: g.filename,
            createdAt: g.createdAt,
            jobOffer: { title: offer.title, company: offer.company },
          }))}
        />
      </section>
    </div>
  );
}
