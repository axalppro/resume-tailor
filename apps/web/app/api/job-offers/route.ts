/**
 * POST /api/job-offers — create a job-offer record
 * GET  /api/job-offers — list (most-recent first)
 */
import { NextRequest, NextResponse } from "next/server";
import { JobOfferCreateSchema } from "@resume-tailor/shared-types";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  // Phase 3 history view needs PDF count + the most-recent session status for
  // each row. We fetch sessions ordered desc and pick [0] in JS — Prisma can't
  // do a per-row LIMIT 1 in a single query.
  const offers = await prisma.jobOffer.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      _count: { select: { generatedResumes: true, tailoringSessions: true } },
      tailoringSessions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, status: true, updatedAt: true },
      },
    },
  });

  const enriched = offers.map((o) => {
    const latest = o.tailoringSessions[0] ?? null;
    return {
      id: o.id,
      title: o.title,
      company: o.company,
      source: o.source,
      url: o.url,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      // Was the offer parsed yet? Cheap UI hint without sending raw signals.
      parsed: o.signals !== null,
      generatedCount: o._count.generatedResumes,
      sessionCount: o._count.tailoringSessions,
      latestSession: latest,
    };
  });

  return NextResponse.json({ ok: true, offers: enriched });
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
