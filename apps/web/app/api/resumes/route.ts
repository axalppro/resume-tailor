/**
 * GET  /api/resumes  — list generated resumes (most recent first)
 * POST /api/resumes  — create a generated-resume DB record from a pre-compiled PDF
 *                      (compile-pdf with `persist` is usually the better path)
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const items = await prisma.generatedResume.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { jobOffer: { select: { id: true, title: true, company: true } } },
  });
  return NextResponse.json({ ok: true, items });
}

const CreateSchema = z.object({
  jobOfferId: z.string(),
  masterResumeId: z.string(),
  sessionId: z.string().optional(),
  filename: z.string(),
  typstSource: z.string(),
  pdfPath: z.string(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const created = await prisma.generatedResume.create({ data: parsed.data });
  return NextResponse.json({ ok: true, item: created }, { status: 201 });
}
