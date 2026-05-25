/**
 * POST /api/job-offers — create a job-offer record
 * GET  /api/job-offers — list (most-recent first)
 */
import { NextRequest, NextResponse } from "next/server";
import { JobOfferCreateSchema } from "@resume-tailor/shared-types";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const offers = await prisma.jobOffer.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ ok: true, offers });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = JobOfferCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid job-offer payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const offer = await prisma.jobOffer.create({ data: parsed.data });
  return NextResponse.json({ ok: true, offer }, { status: 201 });
}
