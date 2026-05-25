/**
 * GET/PATCH /api/tailoring-sessions/[sessionId]
 *
 * GET   — returns the session row plus the parsed `approved` and `suggestions`
 *         JSON blobs.
 * PATCH — saves a draft (or final) `approved` ApprovedTailoring payload and
 *         optionally updates `status`. Used by the "Save draft" button on the
 *         job-offer detail page.
 *
 * No deletion endpoint is exposed in Phase 2 — sessions are append-only.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ApprovedTailoringSchema } from "@resume-tailor/shared-types";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const PatchSchema = z.object({
  approved: ApprovedTailoringSchema.partial().passthrough(),
  status: z.enum(["draft", "approved", "rendered"]).optional(),
});

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await ctx.params;
  const session = await prisma.tailoringSession.findUnique({
    where: { id: sessionId },
  });
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, session });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.tailoringSession.findUnique({
    where: { id: sessionId },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.tailoringSession.update({
    where: { id: sessionId },
    data: {
      approved: parsed.data.approved as unknown as object,
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
    },
  });

  return NextResponse.json({ ok: true, session: updated });
}
