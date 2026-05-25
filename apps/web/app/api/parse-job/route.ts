/**
 * POST /api/parse-job
 * Body: { jobOfferId: string }  OR  { rawText: string }
 *
 * Runs the AI parse-job step. In Phase 1 this is mocked deterministically.
 * Validates the LLM output against JobSignalsSchema before persisting.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseJob } from "@/lib/ai";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const BodySchema = z.union([
  z.object({ jobOfferId: z.string() }),
  z.object({ rawText: z.string().min(1) }),
]);

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Provide either jobOfferId or rawText" },
      { status: 400 },
    );
  }

  let rawText: string;
  let jobOfferId: string | null = null;

  if ("jobOfferId" in parsed.data) {
    const offer = await prisma.jobOffer.findUnique({ where: { id: parsed.data.jobOfferId } });
    if (!offer) {
      return NextResponse.json({ ok: false, error: "Job offer not found" }, { status: 404 });
    }
    rawText = offer.rawText;
    jobOfferId = offer.id;
  } else {
    rawText = parsed.data.rawText;
  }

  const { signals, trace } = await parseJob(rawText);

  if (jobOfferId) {
    await prisma.jobOffer.update({
      where: { id: jobOfferId },
      data: { signals: signals as unknown as object },
    });
  }

  return NextResponse.json({
    ok: true,
    signals,
    trace: { promptName: trace.promptName, version: trace.promptVersion, ms: trace.ms, mocked: trace.mocked },
  });
}
