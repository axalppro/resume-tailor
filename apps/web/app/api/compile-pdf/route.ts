/**
 * POST /api/compile-pdf
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PDFDocument } from "pdf-lib";
import { compilePdf } from "@/lib/typst";
import { savePdf } from "@/lib/storage";
import { prisma } from "@/lib/db";
import { TemplateIdSchema } from "@resume-tailor/shared-types";

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
  template: TemplateIdSchema.default("neat-cv"),
  persist: z.object({ jobOfferId: z.string(), masterResumeId: z.string(), sessionId: z.string().optional() }).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid request", issues: parsed.error.flatten() }, { status: 400 });
  }

  const result = await compilePdf({ source: parsed.data.source, data: parsed.data.data as never, filename: parsed.data.filename, template: parsed.data.template });
  if (!result.ok) return NextResponse.json(result, { status: 502 });

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

  return NextResponse.json({ ok: true, filename: result.filename, bytes: result.bytes, compileMs: result.compileMs, pdfBase64: result.pdfBase64, pageCount, generatedResumeId, savedPath });
}
