# /reset-db

Run all pending Prisma migrations then re-seed the database.

```bash
pnpm db:migrate && pnpm db:seed
```

Requires Postgres to be running (`pnpm docker:up`). Use after pulling schema changes or when you need a clean seed state.
