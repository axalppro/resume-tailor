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
          Paste a job description or upload a <code>.txt</code> or{" "}
          <code>.md</code> file. Saving redirects you to the tailoring session
          page where you can run "Parse with AI" then "Tailor with AI".
        </p>
      </div>
      <JobOfferUpload onCreated={(id) => router.push(`/jobs/${id}`)} />
    </div>
  );
}
