# AGENTS.md — Agent guidance for Resume Tailor

Purpose
- Document how automated agents (Copilot, background agents, or CI agents) should operate in this repo.

What agents may do
- Run workspace checks (install, typecheck, lint, build) and open PRs with fixes.
- Propose prompt edits in packages/prompts and version bumps for prompts.
- Update or add Typst template adapters under apps/compiler or packages related to templates.
- Create or update tests and CI workflows, but avoid broad refactors without human approval.

Guidelines for agents
- Use pnpm workspace filtering for targeted changes: `pnpm --filter <pkg> <script>`.
- Update Zod schemas in packages/shared-types when changing API contracts; run `pnpm typecheck` before PRs.
- When modifying prompts, add a new prompt version rather than replacing historical versions in packages/prompts.
- Never expose or change network access for the compiler service. Any change that affects apps/compiler exposure must be human-reviewed.
- Avoid committing secrets or API keys. If an API key is required for local testing, add instructions to .env.example only; never add real keys.

PRs created by agents
- Title format: `[agent] <short description>` (e.g., `[agent] fix: lint errors in @resume-tailor/web`).
- Include a short summary, the commands run to validate the change, and a pointer to relevant tests or schema updates.
- Add `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>` to commits if the agent authored the change.

Where to look
- prompts: packages/prompts/ (edit prompts here)
- types: packages/shared-types/ (update Zod schemas)
- web: apps/web/ (API + UI)
- compiler: apps/compiler/ (Typst compiler service)

Contact for human review
- Tag the appropriate maintainers in CODEOWNERS (not present by default). If unsure, assign the PR to the repository owner for review.
