/**
 * POST /api/sample-pdf
 * --------------------
 * Phase 1 acceptance smoke test. No body required.
 *
 * Exercises the full chain:
 *   1. Load the seeded master resume from Postgres
 *   2. Build a hardcoded SelectedResume (matches data/seed selected-2.json)
 *   3. Load the Typst base template
 *   4. Send (source + payload) to the compiler microservice
 *   5. Return the resulting PDF as base64 so the browser can preview it
 *
 * No AI calls are made — this is purely a "does the pipe work?" test.
 */
import { NextResponse } from "next/server";
import { MasterResumeSchema, type SelectedResume } from "@resume-tailor/shared-types";
import { prisma } from "@/lib/db";
import { loadBaseTemplate, compilePdf } from "@/lib/typst";

export const runtime = "nodejs";

const SAMPLE_SELECTED: SelectedResume = {
  headline: "Embedded Systems / Software Engineer",
  profile: "embedded-hands-on",
  capabilities: [
    "embedded-firmware",
    "software-apps",
    "debugging-testing",
    "industrial-iot-data",
    "electronics-pcb",
    "5g-systems",
  ],
  experience: ["hes-so-research-assistant", "studer-repair-technician"],
  education: ["hes-so-bsc-industrial-systems", "eptm-vet-electronics"],
  projects: ["nocctua-technical-lead", "line-crossing-detection", "jet-pack-replica"],
  languages: ["french", "english", "german"],
  certifications: [],
  additional_experience: [],
};

export async function POST() {
  const profile = await prisma.masterResumeProfile.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (!profile) {
    return NextResponse.json(
      { ok: false, error: "No MasterResumeProfile in DB. Run `pnpm db:seed`." },
      { status: 500 },
    );
  }
  const master = MasterResumeSchema.parse(profile.data);
  const source = await loadBaseTemplate();

  const result = await compilePdf({
    source,
    data: { master, selected: SAMPLE_SELECTED },
    filename: `sample-${master.basics.last_name}.pdf`,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 502 });
  }
  return NextResponse.json(result);
}
