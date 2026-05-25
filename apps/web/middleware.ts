// Phase 1: no auth, no rewrites. File reserved so route handlers can later
// gain rate-limiting, IP-allowlist, or session checks without restructuring.
import { NextResponse } from "next/server";

export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
