# apps/compiler

Stateless Fastify microservice that compiles Typst source to PDF.

## Endpoints
- `GET /health` — liveness check
- `POST /compile` — compile request → PDF

Request shape is defined in `packages/shared-types/src/typst.ts` (`CompileRequestSchema`). The schema is **intentionally inlined** in `src/server.ts` so the compiled `dist/` runs without needing workspace TS sources at runtime. Keep both in sync.

## Request / response flow
1. Receive `{ source, data?, filename?, template }` as JSON
2. Write `source` to a temp dir as a `.typ` file; write `data` as `resume-data.json` if present
3. Run `typst compile` against the temp dir
4. Read the output PDF, base64-encode it, delete the temp dir
5. Return `{ ok, pdfBase64, bytes, compileMs }`

## Templates
Typst templates live in `src/templates/`. Currently: `neat-cv.typ`, `brilliant-cv.typ`. Templates access structured data via `#let data = json("./resume-data.json")`.

## After any change here
Run `pnpm docker:rebuild:compiler` — the service runs in Docker and changes are not picked up by hot reload.

## Security
This service compiles **arbitrary Typst input** — never expose it publicly. It is internal-only and must stay behind the Docker network.

## Checks
```bash
pnpm --filter @resume-tailor/compiler typecheck
pnpm --filter @resume-tailor/compiler lint
```
