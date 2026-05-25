/**
 * GET   /api/master-resume/default/directives
 * PATCH /api/master-resume/default/directives
 *
 * Convenience wrapper around the global tailoring directives stored on the
 * canonical (earliest-created) MasterResumeProfile. The single-user product
 * model means the user usually has exactly one profile, so we expose a
 * "default" alias instead of forcing the client to learn the cuid first.
 *
 * Phase 3. Free-form style guidance only \u2014 hard fact rules still apply at
 * the prompt level. See `DIRECTIVES_SAFETY_ADDENDUM` in @resume-tailor/prompts.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  DirectivesSchema,
  parseDirectives,
} from "@resume-tailor/shared-types";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

async function getDefaultProfile() {
  return prisma.masterResumeProfile.findFirst({
    orderBy: { createdAt: "asc" },
  });
}

export async function GET() {
  const profile = await getDefaultProfile();
  if (!profile) {
    return NextResponse.json(
      { ok: false, error: "No master resume profile seeded yet" },
      { status: 404 },
    );
  }
  const directives = parseDirectives(profile.directives);
  return NextResponse.json({
    ok: true,
    masterResumeId: profile.id,
    directives,
  });
}

export async function PATCH(req: NextRequest) {
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
  const profile = await getDefaultProfile();
  if (!profile) {
    return NextResponse.json(
      { ok: false, error: "No master resume profile seeded yet" },
      { status: 404 },
    );
  }
  const updated = await prisma.masterResumeProfile.update({
    where: { id: profile.id },
    data: { directives: parsed.data as unknown as object },
  });
  return NextResponse.json({
    ok: true,
    masterResumeId: updated.id,
    directives: parseDirectives(updated.directives),
  });
}
