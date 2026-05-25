/**
 * POST /api/tailor
 * Body: TailorRequest
 *
 * Runs the AI pipeline end-to-end against the master resume + job signals
 * and creates a TailoringSession holding all suggestions. The user then
 * approves/rejects them in the UI before /api/generate-typst.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  TailorRequestSchema,
  JobSignalsSchema,
  MasterResumeSchema,
} from "@resume-tailor/shared-types";
import { prisma } from "@/lib/db";
import { buildTailorResponse } from "@/lib/ai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = TailorRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid TailorRequest", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { jobOfferId, masterResumeId } = parsed.data;

  const [offer, profile, blocks] = await Promise.all([
    prisma.jobOffer.findUnique({ where: { id: jobOfferId } }),
    prisma.masterResumeProfile.findUnique({ where: { id: masterResumeId } }),
    prisma.contentBlock.findMany({ where: { profileId: masterResumeId, active: true } }),
  ]);

  if (!offer) return NextResponse.json({ ok: false, error: "Job offer not found" }, { status: 404 });
  if (!profile) return NextResponse.json({ ok: false, error: "Master resume not found" }, { status: 404 });
  if (!offer.signals) {
    return NextResponse.json(
      { ok: false, error: "Job offer has not been parsed yet; call /api/parse-job first" },
      { status: 400 },
    );
  }

  const signals = JobSignalsSchema.parse(offer.signals);
  const master = MasterResumeSchema.parse(profile.data);

  // Pre-create the session so we can stamp its id onto the response.
  const session = await prisma.tailoringSession.create({
    data: {
      jobOfferId,
      masterResumeId,
      status: "draft",
      suggestions: {},
    },
  });

  const response = await buildTailorResponse({
    sessionId: session.id,
    master,
    blocks: blocks.map((b) => ({
      ...b,
      type: b.type as never,
      refId: b.refId ?? undefined,
    })),
    signals,
    request: parsed.data,
  });

  await prisma.tailoringSession.update({
    where: { id: session.id },
    data: { suggestions: response as unknown as object },
  });

  return NextResponse.json({ ok: true, response });
}
