/**
 * POST /api/compile-pdf
 * Body: { source: string, data: unknown, filename?: string,
 *         persist?: { jobOfferId, masterResumeId, sessionId? } }
 *
 * Sends the Typst payload to the compiler microservice, optionally persists
 * the resulting PDF via the storage abstraction + GeneratedResume table, and
 * returns the base64 PDF plus the GeneratedResume id when persisted.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { compilePdf } from "@/lib/typst";
import { savePdf } from "@/lib/storage";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const BodySchema = z.object({
  source: z.string().min(1),
  data: z.unknown(),
  filename: z.string().default("resume.pdf"),
  persist: z
    .object({
      jobOfferId: z.string(),
      masterResumeId: z.string(),
      sessionId: z.string().optional(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await compilePdf({
    source: parsed.data.source,
    data: parsed.data.data as never,
    filename: parsed.data.filename,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 502 });
  }

  let generatedResumeId: string | undefined;
  let savedPath: string | undefined;
  if (parsed.data.persist) {
    const buf = Buffer.from(result.pdfBase64, "base64");
    const saved = await savePdf({ filename: parsed.data.filename, bytes: buf });
    savedPath = saved.relativePath;

    const created = await prisma.generatedResume.create({
      data: {
        jobOfferId: parsed.data.persist.jobOfferId,
        masterResumeId: parsed.data.persist.masterResumeId,
        sessionId: parsed.data.persist.sessionId ?? null,
        filename: parsed.data.filename,
        typstSource: parsed.data.source,
        pdfPath: saved.path,
      },
    });
    generatedResumeId = created.id;
  }

  return NextResponse.json({
    ok: true,
    filename: result.filename,
    bytes: result.bytes,
    compileMs: result.compileMs,
    pdfBase64: result.pdfBase64,
    generatedResumeId,
    savedPath,
  });
}
