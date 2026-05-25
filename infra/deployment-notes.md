# Deployment notes (future work — Phase 3)

Phase 1 runs locally only. These are the planned production targets when
Phase 3 picks up.

## Frontend — Vercel

- `apps/web` deploys cleanly to Vercel as a Next.js project.
- Environment variables to set in the Vercel project:
  - `DATABASE_URL` — managed Postgres (Neon, Supabase, etc.)
  - `COMPILER_URL` — public URL of the Typst compiler service
  - `OPENAI_API_KEY` (or other provider key) — Phase 2
- Build command: `pnpm --filter @resume-tailor/web build`
- Root directory: repo root (Vercel detects pnpm workspaces).

## Compiler — self-hosted container

The compiler is a private microservice. It must NOT be public — anyone who
can POST to it can ask it to compile arbitrary Typst, which is a sandbox you
do not want to expose. Recommended setup:

1. Build the image: `docker build -f apps/compiler/Dockerfile -t resume-tailor/compiler .`
2. Push to a private registry (GHCR, Docker Hub private, ECR).
3. Deploy behind a private tunnel:
   - Fly.io, Render, Railway, or a small Hetzner VPS
   - Restrict ingress to the Vercel egress IP range, **or**
   - Front it with Cloudflare Tunnel + access policy, **or**
   - Use Tailscale and have Vercel call it through a sidecar — easiest for a
     private app.
4. Mount a persistent volume on `/tmp/typst-cache` so package downloads survive
   redeploys.

## Database — managed Postgres

Neon is the simplest free-tier fit for a private app on Vercel. Use a
connection-pooler URL for `DATABASE_URL`.

## Storage — Phase 3

`lib/storage.ts` already abstracts file writes. Swap the local-fs
implementation for S3 (e.g. Cloudflare R2) by editing only that file.
