"use client";

import { useRouter } from "next/navigation";
import { JobOfferUpload } from "@/components/job-offer-upload";

export default function NewJobOfferPage() {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-dark">New job offer</h1>
        <p className="mt-2 text-sm text-slate-600">
          Paste a job description or upload a <code>.txt</code> file. Phase 1
          just persists it; Phase 2 will trigger the AI parse + tailoring flow
          from the job-offer detail page.
        </p>
      </div>
      <JobOfferUpload onCreated={(id) => router.push(`/jobs/${id}`)} />
    </div>
  );
}
