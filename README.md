# Resume Tailor

A private, local-first web app that turns a master resume database into
tailored, one-page PDFs through a tightly-controlled AI + manual workflow.

> **Status: Phase 1 (MVP) — architecture wired end-to-end, AI calls mocked.**
> Build, run, click **Generate sample PDF**, and confirm a real PDF comes
> back. Phase 2 (real AI + manual selection UI) and Phase 3 (auth, polish,
> deployment) are explicitly **not built yet**.

---

## Table of contents

1. [Stack decision (why this, not that)](#stack-decision)
2. [Repo layout](#repo-layout)
3. [Local setup](#local-setup)
4. [Phase 1 test instructions](#phase-1-test-instructions)
5. [AI architecture explanation](#ai-architecture)
6. [Data model](#data-model)
7. [API surface](#api-surface)
8. [Three-phase roadmap](#roadmap)

---

<a id="stack-decision"></a>
## 1. Stack decision

| Layer | Choice | Why |
|---|---|---|
| Frontend & API | **Next.js 15 App Router + React 19 + TypeScript** | Single full-stack app, route handlers act as the BFF, Vercel-ready, and lines up with your existing comfort with React + TypeScript. |
| Database | **PostgreSQL** (Docker locally, Neon-style managed later) | Mature, JSON columns hold the master resume + AI suggestions verbatim, free-tier hosts are plentiful. |
| ORM | **Prisma** | Type-safe migrations, plays well with Next.js, generated client is the easiest way to consume Postgres from TS. |
| Validation | **Zod** | Shared types from `packages/shared-types` double as runtime validators for both API inputs and LLM JSON outputs. |
| Compiler microservice | **TypeScript (Fastify) + Typst CLI in Docker** | See the note below — Go was the live alternative and was deliberately rejected. |
| Package manager | **pnpm workspaces** | Cheap, fast, monorepo-native. |

### Why the compiler stays in TypeScript instead of Go

The compiler service is intentionally tiny: receive `{ source, data }`,
write two files to a temp directory, spawn `typst compile`, read the PDF,
return it, then `rm -rf` the temp dir. The hot path is process-spawn +
disk I/O; the network handler does effectively no CPU work.

Concrete reasons to stay in TypeScript:

- **One language, one toolchain.** `pnpm`, `tsx`, `tsc`, the workspace
  graph, and the shared `@resume-tailor/shared-types` package all already
  exist for the web app. Adding Go means a second build system, a second
  CI pipeline, a second image base, and duplicated request/response types
  in `types.go`.
- **Shared types are free.** The compiler and the web app already speak
  the exact same Zod-validated `CompileRequest` / `CompileResponse`
  shapes from `packages/shared-types`. Go would require manual mirroring.
- **No measurable Go win for this workload.** The bottleneck is the
  Typst binary itself (process startup ≈ 50–150 ms plus document compile
  time). Fastify on Node handles thousands of req/s already; we will be
  bound by Typst, not the HTTP layer.
- **Operational simplicity.** One image base (`node:20-bookworm-slim`),
  one health-check pattern, one log format.

Go would be the better choice if the service grew CPU-bound responsibilities
(parsing PDFs, image processing, batch fan-out). It does not, so we keep
it boring. Swap is straightforward if Phase 3 changes the math.

---

<a id="repo-layout"></a>
## 2. Repo layout

```
resume-tailor/
├─ apps/
│  ├─ web/               Next.js app (UI + API route handlers)
│  └─ compiler/          Fastify + Typst CLI HTTP service (Dockerised)
├─ packages/
│  ├─ shared-types/      Zod schemas + TypeScript types shared everywhere
│  ├─ resume-schema/     master-resume.schema.json (JSON Schema)
│  └─ prompts/           Versioned LLM prompt files
├─ infra/
│  ├─ docker-compose.yml db + compiler (+ optional web)
│  └─ deployment-notes.md
├─ data/
│  ├─ seed/              master-resume.json, sample-job-offer.txt
│  └─ generated/         compiled PDFs land here in Phase 1
├─ .env.example
├─ pnpm-workspace.yaml
└─ README.md
```

---

<a id="local-setup"></a>
## 3. Local setup

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9 (`corepack enable && corepack prepare pnpm@9.12.0 --activate`)
- Docker Desktop / OrbStack

### Steps

```bash
# 1. Install workspace deps
cd resume-tailor
pnpm install

# 2. Configure env
cp .env.example .env
cp apps/web/.env.example apps/web/.env

# 3. Bring up Postgres + the compiler container
pnpm docker:up
# (first run builds the compiler image — takes ~2 minutes, mostly the Typst
# binary download and Typst package cache warm-up)

# 4. Run migrations and seed the master resume
pnpm db:migrate
pnpm db:seed

# 5. Start Next.js
pnpm dev
# → http://localhost:3000
```

### Useful scripts

| Script | What |
|---|---|
| `pnpm dev` | Next.js dev server (web) |
| `pnpm dev:compiler` | Compiler service on the host (skip Docker) |
| `pnpm docker:up` / `:down` / `:logs` | Manage `db` + `compiler` containers |
| `pnpm db:migrate` | Apply Prisma migrations |
| `pnpm db:seed` | Reload Aurélien's master resume + content blocks |
| `pnpm db:reset` | Drop and recreate the DB |
| `pnpm build` / `lint` / `typecheck` | All workspaces |

---

<a id="phase-1-test-instructions"></a>
## 4. Phase 1 test instructions

Phase 1 ships with **one acceptance test**: the "Generate sample PDF" button
on the dashboard must produce a real PDF.

1. With `pnpm docker:up` and `pnpm dev` running, open
   <http://localhost:3000>.
2. Click **Generate sample PDF**.
3. Expected: an embedded PDF preview appears within ~1–3 seconds,
   showing the seeded resume. **Download** writes the PDF locally.
4. Additionally verify the full chain via curl:

   ```bash
   curl -X POST http://localhost:3000/api/sample-pdf | jq '.ok, .bytes, .compileMs'
   ```

   You should see `true`, a non-zero byte count, and a compile time in ms.

If anything fails, the most common causes are:

- **Compiler container still warming the Typst package cache** — the first
  compile downloads `@preview/neat-cv`. Wait ~10 s and retry.
- **DB not migrated** — visit the dashboard; the page surfaces the exact
  Prisma error inline.
- **`COMPILER_URL` not set** — defaults to `http://localhost:8787`. Make
  sure compose's `compiler` service is up: `docker compose -f infra/docker-compose.yml ps`.

### What Phase 1 explicitly does NOT do

- **No real LLM calls.** Every AI route returns deterministic mocked data
  that passes the same Zod schemas the real provider's response will be
  validated against. The mocks are clearly tagged `// PHASE 1 MOCK` in
  `apps/web/lib/ai.ts`.
- **No length verification.** As requested: PDFs are rendered, previewed,
  and visually checked by you. A soft warning appears only if downstream
  code populates `pageCount > 1`.
- **No auth.** Local-first private app.
- **No job-offer parsing UI.** The data-entry page works; the tailoring
  session UI is a Phase-2 placeholder.

> **Pause point.** Build and test Phase 1, then stop. Do not start Phase 2
> until you ask explicitly.

---

<a id="ai-architecture"></a>
## 5. AI architecture

The AI layer is structured as **six explicit steps**, with strict
contracts between them. Phase 1 wires every step end-to-end but uses a
deterministic mock for the actual model call (`mockLlmCall` in
`apps/web/lib/ai.ts`); Phase 2 will replace that one function with a real
provider call.

### Step 1 — Input collection

The route handler gathers:

- raw job-offer text
- the seeded `MasterResume` (DB row + exploded `ContentBlock` rows)
- the whitelist of editable fields (`summary`, `capabilities`, `experience_bullet`)
- user constraints (`targetPageCount`, `tone`, `language`)

### Step 2 — Structured extraction (`parseJob`)

Prompt file: `packages/prompts/src/parse-job.ts` (versioned).
LLM is told to return JSON matching this exact shape:

```ts
{
  keywords: string[],
  requiredSkills: string[],
  preferredSkills: string[],
  roleThemes: string[],
  suggestedEmphasis: string[]
}
```

After the model responds:

1. `tryParseJson` strips any stray markdown fences and `JSON.parse` the body.
2. Zod's `JobSignalsSchema.safeParse` validates the shape.
3. If validation fails, the result carries a typed `ValidationResult`
   error so the route handler can retry or surface it cleanly.

### Step 3 — Recommendation (`recommendBlocks`)

Each `ContentBlock` is scored against the signals via
`apps/web/lib/scoring.ts`:

- Tokens are normalised (lowercased, punctuation-stripped).
- Base score = `block.defaultPriority` (0–100).
- Bonus = keyword hits + extra weight for required-skill matches.
- Cap = 100.

Output is a list of `BlockRecommendation` objects (id, type, title, priority,
reason, `recommendedDefault`). The UI consumes these as checkboxes.

This step is **deterministic** in Phase 1 — pure local logic, no model call.
Phase 2 will optionally ask the LLM to re-rank or refine the reasons.

### Step 4 — Controlled rewrites

Only three field types can be rewritten by the model. The whitelist is
enforced by `EditableFieldSchema` in `packages/shared-types/src/tailor.ts`:

- `summary` (one field) — via `tailorSummary`
- `capabilities` (a few items at a time, chosen from the master pool) —
  the model never invents capability text; it ranks pre-existing ones.
- `experience_bullet` (≤ 5 bullets per call) — via `rewriteBullets`

Each prompt's system message includes hard rules: "never change employer,
dates, projects, tools, languages". The schema validates the shape, and
because the data type is JSON we can compare `original` ↔ `suggested`
deterministically before display.

### Step 5 — Human approval

Suggestions are presented in the UI (`AIEditReview`,
`CheckboxSectionPicker`). Nothing is auto-applied. The user must:

- Pick the original, the AI suggestion, or write a custom rewrite for
  each editable field.
- Check the boxes for which content blocks to include.

Result: an `ApprovedTailoring` document (see `packages/shared-types/src/tailor.ts`).

### Step 6 — Rendering

`POST /api/generate-typst` merges the approved selections into a
`RenderPayload` of `{ master, selected }` and returns the entrypoint Typst
source string + the data payload. `POST /api/compile-pdf` forwards both to
the compiler microservice, which writes them to a temp dir, runs
`typst compile`, and returns the PDF (optionally persisting via the
storage abstraction and a `GeneratedResume` row).

### Traceability

Each prompt has a `*_VERSION` constant. Each call produces an `LlmTrace`
(`promptName`, `promptVersion`, `ms`, `mocked`, raw output). Phase 2 will
also persist the trace alongside the `TailoringSession` for diffing /
auditing later.

---

<a id="data-model"></a>
## 6. Data model

See `apps/web/prisma/schema.prisma`. Entities:

- `MasterResumeProfile` — holds the canonical master resume JSON (validated
  with `MasterResumeSchema`).
- `ContentBlock` — every selectable atom (summary variant, capability,
  experience, experience bullet, project, education, certification,
  language, additional experience). Indexed by `(profileId, type, active)`
  and `(profileId, refId)`.
- `JobOffer` — raw text + optional parsed `JobSignals`.
- `TailoringSession` — the AI suggestions (Step 2–4 outputs) and the
  user's `ApprovedTailoring` (Step 5 output).
- `GeneratedResume` — final filename, Typst source, PDF path. Multiple
  versions per `TailoringSession` are allowed (re-renders).

---

<a id="api-surface"></a>
## 7. API surface (route handlers in `apps/web/app/api/`)

| Method+path | Phase 1 behaviour |
|---|---|
| `POST /api/upload` | Accept a multipart file, return its text. |
| `GET  /api/job-offers` | List recent offers. |
| `POST /api/job-offers` | Create a new offer (paste / upload / url). |
| `POST /api/parse-job` | Run mocked `parseJob`, persist signals onto the offer if `jobOfferId` is given. |
| `POST /api/tailor` | Build a `TailoringSession` with mocked AI suggestions + deterministic recommendations. |
| `POST /api/generate-typst` | Return `{ source, data, filename }` ready for the compiler. |
| `POST /api/compile-pdf` | Forward to the compiler microservice; optionally persist a `GeneratedResume`. |
| `GET/POST /api/resumes` | List / create generated-resume records. |
| `POST /api/sample-pdf` | **Phase 1 smoke test.** Pulls the seed master resume + a hardcoded selection, compiles a real PDF, returns base64. |

---

<a id="roadmap"></a>
## 8. Three-phase roadmap

### Phase 1 — **done now**

Architecture validated end-to-end. Mocked AI. One-click sample PDF.

### Phase 2 — **not started**

- Real LLM provider behind the existing `mockLlmCall` seam.
- Parse → suggest → review → checkbox → compile UI flow.
- Persist `JobSignals` and `TailoringSession.suggestions`.
- Save tailoring history per offer.

### Phase 3 — **future**

- Auth, dashboard polish, job-URL ingestion, diff viewer, recommended-mode,
  better PDF preview (multi-page, page-count derived from PDF parser),
  storage abstraction → S3, async queue if compile latency grows,
  Vercel + private compiler tunnel deployment, iPad UX polish.

---

## Pause

**Build Phase 1, run the smoke test, do not start Phase 2 until I ask.**
