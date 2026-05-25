/**
 * GET /api/provider-info
 *
 * Returns the currently-active AI provider id and model name. Used by the
 * dashboard footer badge so the user can see at a glance which backend is
 * wired without opening `.env`.
 *
 * IMPORTANT: never returns API keys or any secret material — only the
 * provider name + model SKU.
 */
import { NextResponse } from "next/server";
import { getProvider } from "@/lib/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const p = getProvider();
    return NextResponse.json({
      ok: true,
      provider: p.name,
      model: p.model,
    });
  } catch (err) {
    // A misconfigured provider (e.g. missing PERPLEXITY_API_KEY) should not
    // crash the entire app — surface the error so the footer can show it.
    return NextResponse.json(
      {
        ok: false,
        provider: process.env.AI_PROVIDER ?? "mock",
        error: (err as Error).message,
      },
      { status: 200 },
    );
  }
}
