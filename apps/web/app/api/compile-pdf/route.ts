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
import { PDFDocument } from "pdf-lib";
import { compilePdf } from "@/lib/typst";
import { savePdf } from "@/lib/storage";
import { prisma } from "@/lib/db";

/**
 * Count the pages in a PDF buffer. Defensive: if pdf-lib chokes on the bytes
 * (corrupt PDF, unknown encryption), return undefined and let the UI fall back
 * to its "unknown length" state instead of failing the whole request.
 */
async function countPages(pdfBuf: Buffer): Promise<number | undefined> {
  try {
    const doc = await PDFDocument.load(pdfBuf, { ignoreEncryption: true });
    return doc.getPageCount();
  } catch {
    return undefined;
  }
}

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

  // Derive page count from the returned PDF — used by the soft "over 1 page"
  // warning on the preview. We do this even when not persisting so the UI can
  // show the count immediately.
  const buf = Buffer.from(result.pdfBase64, "base64");
  const pageCount = await countPages(buf);

  let generatedResumeId: string | undefined;
  let savedPath: string | undefined;
  if (parsed.data.persist) {
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
        pageCount: pageCount ?? null,
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
    pageCount,
    generatedResumeId,
    savedPath,
  });
}
