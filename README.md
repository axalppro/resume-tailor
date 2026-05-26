# Resume Tailor

A private, local-first resume tailoring app that combines structured AI assistance with explicit human approval, then renders the result to PDF through a Typst compiler microservice. The app is built as a pnpm monorepo with a Next.js web app, a Fastify-based compiler service, shared Zod types, versioned prompts, and a seeded master-resume content pool. [cite:3][cite:1][cite:10][cite:95]

> **Status: Phase 3.7 — Phase 2 is complete, Phase 3 is in active delivery.** The current app supports job-offer ingestion, AI parsing, AI-assisted tailoring, a full review UI, save-draft, PDF generation, page-count detection, version history, and ongoing template work including `brilliant-cv` integration. The default `AI_PROVIDER=mock` still keeps the app runnable without an API key, while Ollama, Anthropic, and Perplexity are available through the provider abstraction. [cite:3][cite:76][cite:78]

---

## Table of contents

1. [Current state](#current-state)
2. [Stack](#stack)
3. [Repo layout](#repo-layout)
4. [Local setup](#local-setup)
5. [Workflow](#workflow)
6. [API surface](#api-surface)
7. [Data model](#data-model)
8. [Roadmap](#roadmap)
9. [Notes on templates](#notes-on-templates)

---

<a id="current-state"></a>
## 1. Current state

Resume Tailor is no longer at the old “Phase 2 — functional upload → tailored PDF” milestone. Recent work in this Space moved the app beyond that baseline by shipping the end-to-end tailoring flow, stabilising the review UI, simplifying the approved experience-tag model, and starting multi-template support with `brilliant-cv`. [cite:3][cite:80][cite:83]

### What is live now

- Upload or paste a job offer, parse it into structured `JobSignals`, and persist the offer. [cite:3]
- Run tailoring against a seeded master resume using the provider abstraction (`mock`, `ollama`, `anthropic`, `perplexity`). [cite:3]
- Review AI output in a single-page tailoring session UI: summary, tailored skills, bullet rewrites, per-role keyword lines, and manual-only optional sections. [cite:3][cite:82][cite:83]
- Save a draft, generate a PDF, store the rendered resume, and show a page-count soft warning when the document exceeds one page. [cite:3]
- View version history for generated resumes tied to a job offer. [cite:3]
- Ongoing Phase 3.7 work: template selection in the UI and a second Typst template adapter for `brilliant-cv`. [cite:76][cite:78][web:15][web:18]

### What changed recently in this Space

The most important product-level change before template work was the move away from per-bullet keyword lists to a cleaner per-role keyword line rendered below the bullets, with a clean break in the approved payload shape rather than backward compatibility code. The same thread also stabilised the tailoring UI after several “maximum update depth exceeded” issues caused by child effects depending on freshly-created array props. [cite:80][cite:83]

---

<a id="stack"></a>
## 2. Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend & API | **Next.js 15 App Router + React 19 + TypeScript** | Single full-stack app with server routes, a React review UI, and a deployment path that stays Vercel-friendly. [cite:3][cite:84] |
| Database | **PostgreSQL** | Stores the master resume, content blocks, job offers, tailoring sessions, and generated resumes. [cite:3] |
| ORM | **Prisma** | Handles schema, migrations, and generated client access from the web app. [cite:3] |
| Validation | **Zod** | Shared runtime validation for API bodies, prompt outputs, and compiler request/response contracts. [cite:3][cite:10] |
| Compiler microservice | **Fastify + Typst CLI in Docker** | Keeps PDF compilation isolated and stateless while reusing the same TS toolchain as the web app. [cite:3][cite:9] |
| Package manager | **pnpm workspaces** | The repo is a single pnpm workspace spanning `apps/*` and `packages/*`. [cite:1][cite:95] |

### Why the compiler stays in TypeScript

The compiler service is intentionally tiny: receive `{ source, data }`, write the entrypoint and JSON sidecar into a temp directory, run `typst compile`, return the PDF, and delete the temp directory. That makes the bottleneck the Typst binary itself rather than the HTTP layer, so keeping the compiler in TypeScript avoids a second language, second build pipeline, and duplicated request schemas without giving up meaningful runtime performance. [cite:3][cite:7][cite:9]

---

<a id="repo-layout"></a>
## 3. Repo layout

```text
resume-tailor/
├─ apps/
│  ├─ web/               Next.js app (dashboard UI + API route handlers)
│  └─ compiler/          Fastify + Typst CLI HTTP service
├─ packages/
│  ├─ shared-types/      Shared Zod schemas and TypeScript types
│  ├─ resume-schema/     JSON Schema for the canonical master resume shape
│  └─ prompts/           Versioned LLM prompt files
├─ infra/
│  ├─ docker-compose.yml Local db / compiler / optional ollama stack
│  └─ deployment-notes.md
├─ data/
│  ├─ seed/              Seed resume and sample job-offer data
│  └─ generated/         Locally generated PDFs
├─ .env.example
├─ package.json
├─ pnpm-workspace.yaml
└─ README.md
```

The root workspace is defined by `pnpm-workspace.yaml` with `apps/*` and `packages/*`, and the root scripts delegate development, build, lint, typecheck, database, and Docker operations to the appropriate workspace packages. [cite:1][cite:95]

---

<a id="local-setup"></a>
## 4. Local setup

### Prerequisites

- Node.js >= 20. [cite:1]
- pnpm 9.x, activated through Corepack. [cite:1]
- Docker Desktop or OrbStack for Postgres, the compiler service, and optional Ollama. [cite:3]

### Setup

```bash
# 1. Install workspace dependencies
pnpm install

# 2. Configure env
cp .env.example .env
cp apps/web/.env.example apps/web/.env

# 3. Start local services
pnpm docker:up

# 4. Apply DB migrations and seed the master resume
pnpm db:migrate
pnpm db:seed

# 5. Start the web app
pnpm dev
# http://localhost:3000
```

### Useful scripts

| Script | What it does |
|---|---|
| `pnpm dev` | Starts the Next.js web app. [cite:1] |
| `pnpm dev:compiler` | Starts the compiler service on the host. [cite:1] |
| `pnpm docker:up` / `docker:down` / `docker:logs` | Manages local containers. [cite:1] |
| `pnpm docker:up:ollama` | Starts db + compiler + Ollama profile. [cite:1] |
| `pnpm docker:rebuild:compiler` | Rebuilds only the compiler image, useful after Typst/template changes. [cite:1] |
| `pnpm db:migrate` / `db:seed` | Updates and reseeds the DB. [cite:1] |
| `pnpm build` / `lint` / `typecheck` | Runs checks across all workspaces. [cite:1] |

---

<a id="workflow"></a>
## 5. Workflow

The product flow is now a six-step pipeline with explicit contracts between each step. The route handlers collect the job-offer text and master resume, parse the offer into structured signals, compute recommendations, generate controlled rewrites for editable fields, let the user approve or reject everything in the tailoring UI, then render a Typst payload and compile it to PDF through the compiler microservice. [cite:3]

### Tailoring flow in practice

1. Create or upload a job offer. [cite:3]
2. Parse the offer into `JobSignals` (`keywords`, `requiredSkills`, `preferredSkills`, `roleThemes`, `suggestedEmphasis`). [cite:3]
3. Tailor the resume with the selected AI provider. [cite:3]
4. Review the summary, tailored skills, bullet rewrites, and per-role keyword lines in the single-page session UI. [cite:82][cite:83]
5. Save the approved tailoring as a draft or generate a PDF immediately. [cite:3]
6. Persist the generated resume and show it in preview/history. [cite:3]

### Current approval model

The approval payload has been simplified compared with earlier iterations in this Space. The current design uses tailored skills at the top, simplified approved bullet rewrites, and a single keyword/tag line per role rendered beneath the experience bullets instead of a per-bullet keyword line. [cite:80][cite:83]

---

<a id="api-surface"></a>
## 6. API surface

The current web app exposes these main route handlers under `apps/web/app/api`. [cite:12]

| Method + path | Purpose |
|---|---|
| `POST /api/upload` | Accept a multipart file and return extracted text. [cite:3] |
| `GET/POST /api/job-offers` | List recent job offers or create one from pasted/uploaded text. [cite:3] |
| `POST /api/parse-job` | Run structured extraction and optionally persist signals on the job offer. [cite:3] |
| `POST /api/tailor` | Create a tailoring session with AI suggestions plus deterministic recommendations. [cite:3] |
| `POST /api/generate-typst` | Build the Typst source and structured JSON payload for the selected template. [cite:3][cite:76] |
| `POST /api/compile-pdf` | Send Typst source to the compiler, return the PDF, derive page count, and optionally persist the resume. [cite:3][cite:9] |
| `GET/POST /api/resumes` | List or create generated resume records. [cite:3] |
| `POST /api/sample-pdf` | Smoke-test the compiler/rendering chain with seeded data. [cite:3] |
| `GET /api/provider-info` | Surface the currently configured AI provider to the UI. [cite:12] |

---

<a id="data-model"></a>
## 7. Data model

The key persisted entities remain:

- `MasterResumeProfile` — the canonical seeded master resume JSON. [cite:3]
- `ContentBlock` — selectable content atoms extracted from the master resume. [cite:3]
- `JobOffer` — raw job-offer text and optional parsed signals. [cite:3]
- `TailoringSession` — AI suggestions plus the approved tailoring document. [cite:3]
- `GeneratedResume` — the final rendered output, Typst source, PDF path, and page count. [cite:3]

At the product level, the approved document has evolved since the old README was written. Recent work replaced the older per-bullet keyword approach with per-role tag lines and simplified the bullet approval UI, intentionally as a clean break rather than a compatibility migration layer. [cite:80][cite:83]

---

<a id="roadmap"></a>
## 8. Roadmap

### Phase 1 — done

End-to-end architecture, mock AI responses, and sample PDF generation were completed first to validate the basic pipeline. [cite:3]

### Phase 2 — done

The project then shipped the real provider abstraction, parse-job UI, tailoring session UI, save-draft, PDF generation, page-count soft warning, and generated-resume history. That earlier “Phase 2” status in the old README is now stale. [cite:3]

### Phase 3 — in progress (current: 3.7)

Phase 3 has become the active product-shaping phase rather than a future placeholder. Based on the work already done in this Space, Phase 3 currently includes:

- UX and state-management hardening of the tailoring session, especially around React effect loops and stable props. [cite:83]
- A cleaner approved-tailoring model with tailored skills and per-role keyword lines. [cite:80][cite:82]
- Continued Typst rendering improvements and template abstraction work. [cite:76][cite:79]
- Introduction of user-selectable templates in the UI, starting with `neat-cv` and `brilliant-cv`. [cite:76][cite:78][web:15]
- Ongoing compiler/template compatibility work, including Typst-version compatibility for `brilliant-cv` v4.x. `brilliant-cv` 4.0.1 requires Typst 0.14.0 or newer, so the compiler image must be upgraded from its existing 0.13.1 pin before that template works reliably. [web:15][web:89][web:94]

### Later Phase 3 / Phase 4 candidates

These items still make sense as next steps once Phase 3.7 stabilises:

- authentication and private multi-user workflows,
- deployment hardening,
- better storage backends,
- diff views between versions,
- job-URL ingestion,
- more polished PDF preview and multi-page inspection,
- and additional Typst templates beyond the current pair. [cite:3][cite:79]

---

<a id="notes-on-templates"></a>
## 9. Notes on templates

The original renderer uses `@preview/neat-cv`, and that path is stable in the current compiler flow. Recent work in this Space added a second adapter for `brilliant-cv` and a template selector in the UI so users can choose which Typst template to generate against. [cite:8][cite:76][cite:78][web:15]

A few practical notes matter here:

- `brilliant-cv` v4.0.1 is a breaking-line package that requires Typst 0.14.0 or newer. If the compiler image still uses Typst 0.13.1, `brilliant-cv` imports will fail until the Dockerfile pin is updated and the compiler image is rebuilt. [web:15][web:89][web:94]
- The `brilliant-cv` package is profile-oriented and expects metadata/content modules, so the app uses an adapter template to map the app's JSON payload into the package's `cv-*` calls instead of adopting the package's raw file layout directly. [web:15][web:18][cite:79]
- Because the app's payload is data-driven and may omit some keys, template adapters should use defensive dictionary access for optional JSON keys rather than direct field access when rendering external data in Typst. [web:62][web:63][web:73]

---

## Development note

This README intentionally reflects the state of the project as reconstructed from the current repo plus recent work in this Space. The old README still described the app as Phase 2, but the conversations in this Space clearly show that the app has already moved through the later tailoring, rendering, and UI simplification work and is now in Phase 3.7. [cite:3][cite:80][cite:83]
