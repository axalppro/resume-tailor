/**
 * POST /api/generate-typst
 * Body: { masterResumeId, approved: ApprovedTailoring }
 *
 * Builds the Typst source + structured-data payload (the entrypoint template
 * is content-agnostic — it loads `resume-data.json` next to itself).
 *
 * Returns:
 *   - source     — the .typ entrypoint text (constant across calls in Phase 1)
 *   - data       — the JSON payload the compiler will write to disk
 *   - filename   — suggested filename for the eventual PDF
 */
import { NextRequest, NextResponse } from "next/server";
import { ApprovedTailoringSchema, MasterResumeSchema } from "@resume-tailor/shared-types";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { loadBaseTemplate } from "@/lib/typst";

export const runtime = "nodejs";

const BodySchema = z.object({
  masterResumeId: z.string(),
  approved: ApprovedTailoringSchema,
  filename: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const profile = await prisma.masterResumeProfile.findUnique({
    where: { id: parsed.data.masterResumeId },
  });
  if (!profile) {
    return NextResponse.json({ ok: false, error: "Master resume not found" }, { status: 404 });
  }
  const master = MasterResumeSchema.parse(profile.data);
  const source = await loadBaseTemplate();

  // Phase 3.5: forward the approved bullet rewrites + keyword sub-lines into
  // the Typst payload so the renderer can show per-bullet skill chips. Only
  // bullets the user explicitly kept (included=true) are rendered.
  const payload = {
    master,
    selected: {
      ...parsed.data.approved.selected,
      approvedSummary: parsed.data.approved.approvedSummary,
      approvedCapabilities: parsed.data.approved.approvedCapabilities,
      approvedBulletRewrites: parsed.data.approved.approvedBulletRewrites,
    },
  };

  return NextResponse.json({
    ok: true,
    source,
    data: payload,
    filename: parsed.data.filename ?? `resume-${master.basics.last_name}.pdf`,
  });
}
