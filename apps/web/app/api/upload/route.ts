/**
 * POST /api/upload
 * ----------------
 * Accept a multipart upload (job-offer file or other asset). In Phase 1 we
 * just read the text content and return it. Larger assets would land in
 * `data/generated/` via `lib/storage.ts`.
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Missing 'file' field" }, { status: 400 });
  }
  const text = await file.text();
  return NextResponse.json({
    ok: true,
    filename: file.name,
    size: file.size,
    text,
  });
}
