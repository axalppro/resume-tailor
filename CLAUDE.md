# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Setup
pnpm install
cp .env.example .env && cp apps/web/.env.example apps/web/.env
pnpm docker:up            # start Postgres (5432), compiler (8787), optional Ollama
pnpm db:migrate && pnpm db:seed

# Development
pnpm dev                  # Next.js web app on port 3000
pnpm dev:compiler         # Fastify compiler service (outside Docker)

# Checks
pnpm build
pnpm lint
pnpm typecheck

# Per-package (preferred for targeted changes)
pnpm --filter @resume-tailor/web lint
pnpm --filter @resume-tailor/compiler typecheck

# Database
pnpm db:migrate
pnpm db:seed

# Docker
pnpm docker:up
pnpm docker:down
pnpm docker:rebuild:compiler   # required after any change to apps/compiler or Typst templates
```

There are no tests yet. When added, run them with `pnpm --filter <pkg> test -- <pattern>`.

## Architecture

Pnpm monorepo (`pnpm-workspace.yaml`). Node 20+, pnpm 9.12.0 (Corepack).

```
apps/web/          Next.js 15 + React 19 — UI, API routes, Prisma client, tailoring pipeline
apps/compiler/     Fastify microservice — compiles Typst source to PDF via Typst CLI
packages/shared-types/   Zod schemas and TypeScript types shared across services
packages/prompts/        Versioned LLM prompt strings (the authoritative prompt source)
packages/resume-schema/  JSON Schema for the canonical master resume shape
infra/             docker-compose.yml (Postgres, compiler, Ollama)
data/seed/         Seeded master resume and sample job offer
```

### AI Tailoring Pipeline (6 steps)

1. User uploads/pastes a job offer
2. **Parse job** → `JobSignals` (skills, themes, emphasis) via LLM
3. **Score** → deterministic ranking of master resume content blocks (`lib/scoring.ts`)
4. **Rewrite** → controlled AI rewrites for summary, bullets, experience tags, skills
5. **Human review** → approve/reject each AI suggestion in the single-page review UI
6. **Render** → generate Typst source → POST to compiler → PDF

### AI Provider Abstraction

Configured via `AI_PROVIDER` env var — swap providers by changing env, not code:

| Value | Notes |
|-------|-------|
| `mock` | Default; offline, deterministic |
| `anthropic` | Requires `ANTHROPIC_API_KEY` |
| `ollama` | Local Docker model; requires `OLLAMA_URL` (default `qwen2.5:7b-instruct`) |
| `perplexity` | Requires `PERPLEXITY_API_KEY` |

Provider implementations live in `apps/web/lib/providers/`. The orchestrator is `apps/web/lib/ai.ts` (includes retry-on-validation-failure logic).

### Database

Postgres via Prisma. `apps/web` owns all migrations (`apps/web/prisma/migrations/`).

Key models: `MasterResumeProfile` (seed data + global directives), `ContentBlock` (atomic resume atoms), `JobOffer` (raw text + parsed signals + per-job directives), `TailoringSession` (AI suggestions + approval state), `GeneratedResume` (final PDF + Typst source).

### Compiler Service

`apps/compiler` is a stateless Fastify HTTP server with two endpoints:
- `GET /health`
- `POST /compile` — receives `{ source, data?, filename? }`, writes temp files, runs `typst compile`, returns `{ ok, pdfBase64, bytes, compileMs }`

**The compiler must never be exposed publicly** — it compiles arbitrary Typst input. Typst templates live in `apps/compiler/src/templates/` (current: `base-resume.typ`, `brilliant-cv.typ`).

## Environment Variables

| Variable | Package | Description |
|----------|---------|-------------|
| `DATABASE_URL` | web | Postgres connection string |
| `AI_PROVIDER` | web | `mock` \| `anthropic` \| `ollama` \| `perplexity` |
| `ANTHROPIC_API_KEY` | web | Required when `AI_PROVIDER=anthropic` |
| `OLLAMA_URL` | web | Ollama base URL (default: `http://localhost:11434`) |
| `PERPLEXITY_API_KEY` | web | Required when `AI_PROVIDER=perplexity` |
| `COMPILER_URL` | web | URL of the compiler service (default: `http://localhost:8787`) |
| `PORT` | compiler | Port the compiler listens on (default: `8787`) |
| `HOST` | compiler | Bind address for the compiler (default: `0.0.0.0`) |

## Common Gotchas

- After any change to `apps/compiler/` or Typst templates: `pnpm docker:rebuild:compiler` (hot reload does not apply)
- Prompt changes go in `packages/prompts/` only — never inline prompt text in application code
- Schema changes: update the Zod schema in `packages/shared-types` first, then run `pnpm typecheck`; the `CompileRequestSchema` in `apps/compiler/src/server.ts` is intentionally inlined — keep it in sync with `packages/shared-types/src/typst.ts`

## Key Conventions

**Zod-first contracts** — when changing any API request/response or compiler payload shape, update the Zod schema in `packages/shared-types` first, then run `pnpm typecheck`.

**Prompt versioning** — edit prompts in `packages/prompts/`. Add a new versioned export rather than replacing a historical version. Never inline prompt text in application code.

**Directives system** — user-authored tailoring instructions stored as JSON in `MasterResumeProfile.directives` (global) and `JobOffer.directives` (per-job). These are injected into prompts at runtime.

**Singleton clients** — Prisma client and LLM provider are global singletons to survive Next.js HMR reloads. Follow the same pattern for any new shared stateful resource.

**Internal package scope** — all workspace packages use `@resume-tailor/*` and are referenced with `workspace:*` in package.json.
