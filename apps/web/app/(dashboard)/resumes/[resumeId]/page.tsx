import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function GeneratedResumePage({
  params,
}: {
  params: Promise<{ resumeId: string }>;
}) {
  const { resumeId } = await params;
  const item = await prisma.generatedResume.findUnique({
    where: { id: resumeId },
    include: { jobOffer: true },
  });
  if (!item) notFound();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-brand-dark">{item.filename}</h1>
        <p className="text-sm text-slate-600">
          {item.jobOffer.title} · {item.jobOffer.company} ·{" "}
          {item.createdAt.toLocaleString()}
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-xs text-slate-500">Local PDF path</div>
        <code className="text-sm text-slate-800">{item.pdfPath}</code>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Typst source
        </h2>
        <pre className="max-h-80 overflow-auto whitespace-pre-wrap text-xs text-slate-700">
          {item.typstSource}
        </pre>
      </section>
    </div>
  );
}
