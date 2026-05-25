/**
 * GET    /api/job-offers/[jobId] \u2014 fetch one offer
 * DELETE /api/job-offers/[jobId] \u2014 delete the offer + cascade-related rows.
 *
 * Phase 3 history feature: the dashboard list lets the user prune old jobs.
 * The Prisma schema already declares onDelete: Cascade for TailoringSession
 * and GeneratedResume, so the DB rows go automatically. We additionally
 * best-effort unlink the PDF files on disk so the data/generated folder
 * doesn't grow forever \u2014 failures there don't roll back the DB delete.
 */
import { NextRequest, NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await ctx.params;
  const offer = await prisma.jobOffer.findUnique({
    where: { id: jobId },
    include: {
      _count: { select: { tailoringSessions: true, generatedResumes: true } },
    },
  });
  if (!offer) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, offer });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await ctx.params;

  // Snapshot the PDF paths before the DB row disappears so we can attempt
  // disk cleanup afterwards.
  const generated = await prisma.generatedResume.findMany({
    where: { jobOfferId: jobId },
    select: { pdfPath: true },
  });

  const existing = await prisma.jobOffer.findUnique({ where: { id: jobId } });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  // DB cascade handles tailoringSessions + generatedResumes rows.
  await prisma.jobOffer.delete({ where: { id: jobId } });

  // Best-effort disk cleanup. ENOENT and friends are non-fatal here.
  const cleanupResults = await Promise.allSettled(
    generated.map((g) => unlink(g.pdfPath)),
  );
  const filesDeleted = cleanupResults.filter((r) => r.status === "fulfilled").length;

  return NextResponse.json({
    ok: true,
    deleted: { jobId, generatedResumes: generated.length, filesDeleted },
  });
}
