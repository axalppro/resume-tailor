# Copilot instructions for Resume Tailor

Purpose
- Short guidance to help Copilot and AI assistants operate in this repository.

Quick commands
- Install workspace deps: `pnpm install`
- Start web app (dev): `pnpm dev` or `pnpm --filter @resume-tailor/web dev`
- Start compiler (dev): `pnpm dev:compiler` or `pnpm --filter @resume-tailor/compiler dev`
- Build workspace: `pnpm build` (root)
- Lint workspace: `pnpm lint` or per-package `pnpm --filter @resume-tailor/web lint`
- Typecheck: `pnpm typecheck` or per-package `pnpm --filter <pkg> typecheck`
- DB migrate/seed: `pnpm db:migrate` / `pnpm db:seed`
- Docker (local infra): `pnpm docker:up`, `pnpm docker:rebuild:compiler`
- Run a single package script: `pnpm --filter <pkg> <script>`
- Running a single test: No test scripts currently. When tests are added, run:
  `pnpm --filter <pkg> test -- <pattern-or-testname>`

High-level architecture
- Monorepo managed with pnpm workspaces (apps/* and packages/*).
- apps/web: Next.js 15 app (UI + server routes + API handlers).
- apps/compiler: Fastify microservice that writes Typst source, runs the Typst CLI in Docker, and returns PDFs. The compiler must remain private/behind a tunnel.
- packages/shared-types: Zod schemas and shared TypeScript types used across services.
- packages/prompts: Versioned LLM prompt files (primary place to edit prompts).
- Prisma + Postgres: `apps/web` owns Prisma migrations, seeds, and client generation.
- infra/docker-compose.yml defines local Postgres, compiler, and optional Ollama.

Key conventions and repo-specific patterns
- Internal packages use the scope `@resume-tailor/*` and are referenced with `workspace:*` in package.json.
- Use pnpm filter syntax for per-package commands: `pnpm --filter @resume-tailor/web <cmd>`.
- Shared runtime validation: prefer Zod schemas from `packages/shared-types` for API request/response and compiler payloads.
- AI provider abstraction: configured via `AI_PROVIDER` (default: `mock`). Providers (ollama/anthropic/perplexity) are pluggable — update env, not code, for quick swaps.
- Prompts are versioned in `packages/prompts`; avoid editing historical versions unless intentionally bumping prompt versioning.
- Typst templates: template adapters map app JSON to external template package calls (e.g., `brilliant-cv`). If updating Typst or template packages, rebuild the compiler image (`pnpm docker:rebuild:compiler`).
- Compiler service safety: do NOT expose `apps/compiler` publicly; it compiles arbitrary Typst input.

Where to look first
- README.md (root): project overview and workflow.
- apps/web/: Next.js app (API routes under `app/api`).
- apps/compiler/: Fastify compiler microservice and Dockerfile.
- packages/prompts/: prompt definitions and versioning.
- packages/shared-types/: Zod schemas and shared types.
- infra/docker-compose.yml and .env.example for local infra and environment variables.

Existing AI/assistant configs
- AGENTS.md created at the repository root with basic agent guidance. No CLAUDE.md or other assistant-specific files were found to incorporate.

Notes for Copilot sessions
- Prefer editing prompts in `packages/prompts` and updating prompt versions rather than inlining prompt text in code.
- When generating or modifying API contracts, update Zod schemas in `packages/shared-types` first and run typecheck.
- Use `pnpm --filter ...` to run or build only the package you intend to change to speed iteration.

Summary
- This file lists the most-used commands, the high-level architecture, and repo-specific conventions that Copilot should follow when making changes.

