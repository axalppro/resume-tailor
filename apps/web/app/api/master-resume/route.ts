/**
 * GET   /api/master-resume
 * PUT   /api/master-resume
 *
 * CRUD endpoints for the master resume data (full profile including skills,
 * experience, education, etc.). Operates on the canonical MasterResumeProfile.data
 * JSON blob.
 *
 * The single-user product model means exactly one profile typically exists,
 * fetched in creation order.
 */
import { NextRequest, NextResponse } from "next/server";
import { MasterResumeSchema } from "@resume-tailor/shared-types";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

async function getDefaultProfile() {
  return prisma.masterResumeProfile.findFirst({
    orderBy: { createdAt: "asc" },
  });
}

/**
 * GET /api/master-resume
 * Returns the full master resume data from the canonical profile.
 */
export async function GET() {
  try {
    const profile = await getDefaultProfile();
    if (!profile) {
      return NextResponse.json(
        { ok: false, error: "No master resume profile found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      masterResumeId: profile.id,
      data: profile.data,
    });
  } catch (error) {
    console.error("GET /api/master-resume error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch master resume" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/master-resume
 * Updates the master resume data with full validation against MasterResumeSchema.
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // Validate against MasterResumeSchema
    const parsed = MasterResumeSchema.safeParse(body?.data ?? body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid master resume data",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const profile = await getDefaultProfile();
    if (!profile) {
      return NextResponse.json(
        { ok: false, error: "No master resume profile found" },
        { status: 404 },
      );
    }

    // Update the profile's data field
    const updated = await prisma.masterResumeProfile.update({
      where: { id: profile.id },
      data: { data: parsed.data as unknown as object },
    });

    return NextResponse.json({
      ok: true,
      masterResumeId: updated.id,
      data: updated.data,
    });
  } catch (error) {
    console.error("PUT /api/master-resume error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to update master resume" },
      { status: 500 },
    );
  }
}
