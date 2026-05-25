import { SamplePdfButton } from "@/components/sample-pdf-button";
import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Touch the DB but degrade gracefully if it isn't running yet so the page
  // still renders during first-time setup.
  let profileCount = 0;
  let blockCount = 0;
  let recentResumes: { id: string; filename: string; createdAt: Date }[] = [];
  let dbError: string | null = null;

  try {
    [profileCount, blockCount, recentResumes] = await Promise.all([
      prisma.masterResumeProfile.count(),
      prisma.contentBlock.count(),
      prisma.generatedResume.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, filename: true, createdAt: true },
      }),
    ]);
  } catch (err) {
    dbError = (err as Error).message;
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-brand-dark">Phase 1 — smoke test</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          This button runs the full pipeline against the seeded master resume:
          fetch from Postgres → load the Typst template → POST to the compiler
          microservice → render the returned PDF inline. No AI is involved in
          this path — it just proves the architecture is wired end-to-end.
        </p>
        <div className="mt-4">
          <SamplePdfButton />
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
        <Card label="Generated resumes" value={recentResumes.length} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Recent generated resumes</h2>
          <Link href="/jobs/new" className="text-sm text-brand hover:underline">
            + New job offer
          </Link>
        </div>
        {recentResumes.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            Nothing yet. Generate the sample PDF above to confirm the pipeline,
            then create a job offer from the “New job offer” link.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {recentResumes.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                <Link href={`/resumes/${r.id}`} className="text-brand hover:underline">
                  {r.filename}
                </Link>
                <span className="text-xs text-slate-400">{r.createdAt.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
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
