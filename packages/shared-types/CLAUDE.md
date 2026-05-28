# packages/shared-types

Zod schemas and TypeScript types shared between `apps/web` and `apps/compiler`.

## Files
| File | Contents |
|------|----------|
| `src/resume.ts` | Master resume shape (`ContentBlock`, etc.) |
| `src/job.ts` | `JobOffer`, `JobSignals` |
| `src/tailor.ts` | `TailoringSession`, suggestion/approval shapes |
| `src/typst.ts` | `CompileRequestSchema`, `CompileResponseSchema`, `TemplateId` |
| `src/index.ts` | Re-exports everything |

## Rule: Zod first
When changing any API request/response or compiler payload shape:
1. Edit the Zod schema here first
2. Run `pnpm typecheck` — inferred types update automatically
3. Never define a type manually if Zod can infer it (`z.infer<typeof Schema>`)

## Adding a new schema
1. Add to the most relevant file (or create a new one)
2. Export from `src/index.ts`
3. Run `pnpm --filter @resume-tailor/shared-types typecheck`

## Consuming in apps
```ts
import { CompileRequestSchema, type CompileRequest } from "@resume-tailor/shared-types";
```

## Compiler special case
`apps/compiler/src/server.ts` inlines a copy of `CompileRequestSchema` to avoid a runtime dependency on workspace TS sources. Keep it in sync with `src/typst.ts` whenever that schema changes.
