# /check

Run typecheck and lint across the full monorepo.

```bash
pnpm typecheck && pnpm lint
```

Use after any edit to catch type errors and lint violations before committing. For a single package use `pnpm --filter @resume-tailor/<pkg> typecheck` instead.
