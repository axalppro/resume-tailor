/**
 * GET   /api/job-offers/[jobId]/directives
 * PATCH /api/job-offers/[jobId]/directives
 *
 * Per-job tailoring directives (Phase 3). These overlay the global directives
 * stored on `MasterResumeProfile.directives` \u2014 see /api/tailor for the merge.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  DirectivesSchema,
  parseDirectives,
} from "@resume-tailor/shared-types";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await ctx.params;
  const offer = await prisma.jobOffer.findUnique({
    where: { id: jobId },
    select: { id: true, directives: true },
  });
  if (!offer) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    jobId: offer.id,
    directives: parseDirectives(offer.directives),
  });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const parsed = DirectivesSchema.safeParse(body?.directives ?? body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid directives payload",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }
  const existing = await prisma.jobOffer.findUnique({ where: { id: jobId } });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  const updated = await prisma.jobOffer.update({
    where: { id: jobId },
    data: { directives: parsed.data as unknown as object },
    select: { id: true, directives: true },
  });
  return NextResponse.json({
    ok: true,
    jobId: updated.id,
    directives: parseDirectives(updated.directives),
  });
}
