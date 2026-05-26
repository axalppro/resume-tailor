/**
 * POST /api/generate-typst
 * Body: { masterResumeId, approved: ApprovedTailoring }
 */
import { NextRequest, NextResponse } from "next/server";
import { ApprovedTailoringSchema, MasterResumeSchema, TemplateIdSchema } from "@resume-tailor/shared-types";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { loadTemplate } from "@/lib/typst";

export const runtime = "nodejs";

const BodySchema = z.object({
  masterResumeId: z.string(),
  approved: ApprovedTailoringSchema,
  filename: z.string().optional(),
  template: TemplateIdSchema.default("neat-cv"),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid request", issues: parsed.error.flatten() }, { status: 400 });
  }

  const profile = await prisma.masterResumeProfile.findUnique({ where: { id: parsed.data.masterResumeId } });
  if (!profile) {
    return NextResponse.json({ ok: false, error: "Master resume not found" }, { status: 404 });
  }

  const master = MasterResumeSchema.parse(profile.data);
  const source = await loadTemplate(parsed.data.template);
  const payload = {
    master,
    selected: {
      ...parsed.data.approved.selected,
      approvedSummary: parsed.data.approved.approvedSummary,
      approvedCapabilities: parsed.data.approved.approvedCapabilities,
      approvedBulletRewrites: parsed.data.approved.approvedBulletRewrites,
      approvedExperienceTags: parsed.data.approved.approvedExperienceTags,
    },
  };

  return NextResponse.json({
    ok: true,
    source,
    data: payload,
    template: parsed.data.template,
    filename: parsed.data.filename ?? `resume-${master.basics.last_name}-${parsed.data.template}.pdf`,
  });
}
