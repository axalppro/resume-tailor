import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function JobOfferPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const offer = await prisma.jobOffer.findUnique({ where: { id: jobId } });
  if (!offer) notFound();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-brand-dark">{offer.title}</h1>
        <p className="text-sm text-slate-600">{offer.company}</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Raw job description
        </h2>
        <pre className="max-h-80 overflow-auto whitespace-pre-wrap text-xs text-slate-700">
          {offer.rawText}
        </pre>
      </section>

      <section className="rounded-xl border border-dashed border-slate-300 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Phase 2 — placeholder
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          The tailoring session UI (AI suggestions + checkbox section picker +
          PDF preview) will live here. In Phase 1, the building blocks
          (<code>AIEditReview</code>, <code>CheckboxSectionPicker</code>,{" "}
          <code>PDFPreview</code>) are already wired and reachable via the API
          routes.
        </p>
      </section>
    </div>
  );
}
