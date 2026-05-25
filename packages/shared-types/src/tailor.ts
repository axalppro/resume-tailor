import { z } from "zod";
import { ContentBlockTypeSchema, SelectedResumeSchema } from "./resume";

/**
 * The whitelist of fields the AI is permitted to rewrite. Anything outside this
 * list MUST NOT be modified by the model. Enforced at the route handler.
 */
export const EditableFieldSchema = z.enum([
  "summary",
  "capabilities",
  "experience_bullet",
]);
export type EditableField = z.infer<typeof EditableFieldSchema>;

/**
 * Directives — user-authored, free-text style/voice guidance the AI must take
 * into account when tailoring. Each field maps to a specific tailoring sub-call
 * (summary / capabilities / bullets) plus a catch-all `general`.
 *
 * Directives are style hints only. The AI must NEVER use them as license to
 * invent employers, dates, projects, certifications, tools or languages that
 * are not in the master resume — the safety addendum in tailor-resume.md
 * enforces this.
 *
 * Two storage locations:
 *  - Global, on MasterResumeProfile.directives — applies to every job.
 *  - Per-job, on JobOffer.directives — overlays / complements the global one.
 *
 * Both are merged via `mergeDirectives` before being injected into the prompt.
 */
export const DirectivesSchema = z.object({
  summary: z.string().optional(),
  capabilities: z.string().optional(),
  bullets: z.string().optional(),
  general: z.string().optional(),
});
export type Directives = z.infer<typeof DirectivesSchema>;

/**
 * Merge global + per-job directives. Per-job fields override global ones when
 * both are non-empty; otherwise the global value is kept. Whitespace-only
 * strings are treated as empty.
 */
export function mergeDirectives(
  global: Directives | null | undefined,
  perJob: Directives | null | undefined,
): Directives {
  const pick = (a?: string, b?: string): string | undefined => {
    const bt = (b ?? "").trim();
    if (bt.length > 0) return b;
    const at = (a ?? "").trim();
    if (at.length > 0) return a;
    return undefined;
  };
  return {
    summary: pick(global?.summary, perJob?.summary),
    capabilities: pick(global?.capabilities, perJob?.capabilities),
    bullets: pick(global?.bullets, perJob?.bullets),
    general: pick(global?.general, perJob?.general),
  };
}

/** True if every field is empty / whitespace-only. */
export function isDirectivesEmpty(d: Directives | null | undefined): boolean {
  if (!d) return true;
  return (
    !(d.summary ?? "").trim() &&
    !(d.capabilities ?? "").trim() &&
    !(d.bullets ?? "").trim() &&
    !(d.general ?? "").trim()
  );
}

/**
 * Safely parse a Json value (from Prisma) into a Directives object. Returns an
 * empty object if the input is null / not an object / fails validation —
 * directives are never strictly required.
 */
export function parseDirectives(value: unknown): Directives {
  if (!value || typeof value !== "object") return {};
  const result = DirectivesSchema.safeParse(value);
  return result.success ? result.data : {};
}

export const TailorConstraintsSchema = z.object({
  targetPageCount: z.number().int().min(1).max(3).default(1),
  tone: z.enum(["concise", "neutral", "warm"]).default("concise"),
  language: z.enum(["en", "fr"]).default("en"),
});
export type TailorConstraints = z.infer<typeof TailorConstraintsSchema>;

export const TailorRequestSchema = z.object({
  jobOfferId: z.string(),
  masterResumeId: z.string(),
  editableFields: z.array(EditableFieldSchema).default([
    "summary",
    "capabilities",
    "experience_bullet",
  ]),
  constraints: TailorConstraintsSchema.default({
    targetPageCount: 1,
    tone: "concise",
    language: "en",
  }),
});
export type TailorRequest = z.infer<typeof TailorRequestSchema>;

/**
 * A single AI-suggested edit. All edits are proposals — the user must approve
 * each one before it lands in the rendered Typst output.
 */
export const SuggestedEditSchema = z.object({
  fieldType: EditableFieldSchema,
  /** ID of the source content block being edited (or "summary"/"capabilities"). */
  targetId: z.string(),
  original: z.string(),
  suggested: z.string(),
  rationale: z.string(),
});
export type SuggestedEdit = z.infer<typeof SuggestedEditSchema>;

/**
 * A recommendation for inclusion of a particular content block in the final
 * resume. Surfaced as a checkbox in the UI; the user has the final say.
 */
export const BlockRecommendationSchema = z.object({
  blockId: z.string(),
  blockType: ContentBlockTypeSchema,
  title: z.string(),
  /**
   * `refId` — the id of the underlying master-resume entity this block points
   * to (e.g. `project.id`, `education.id`, `language.id`). Required by the
   * Typst renderer's `get-by-id` lookups; without it the section header
   * renders but its body is empty.
   *
   * Optional in the type to stay backwards-compatible with older sessions,
   * but the recommend pipeline always sets it for manual-only block types.
   */
  refId: z.string().optional(),
  priority: z.number().int().min(0).max(100),
  reason: z.string(),
  recommendedDefault: z.boolean(),
});
export type BlockRecommendation = z.infer<typeof BlockRecommendationSchema>;

export const TailorResponseSchema = z.object({
  sessionId: z.string(),
  suggestedSummary: z.string(),
  suggestedCapabilities: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      rationale: z.string(),
    }),
  ),
  recommendedBlocks: z.array(BlockRecommendationSchema),
  bulletRewrites: z.array(SuggestedEditSchema),
});
export type TailorResponse = z.infer<typeof TailorResponseSchema>;

/**
 * ApprovedTailoring — what the user finalises before Typst generation.
 * Combines manually-approved AI edits with the manually-checked block IDs.
 */
export const ApprovedTailoringSchema = z.object({
  selected: SelectedResumeSchema,
  approvedSummary: z.string(),
  approvedCapabilities: z.array(
    z.object({ id: z.string(), text: z.string() }),
  ),
  approvedBulletRewrites: z.array(
    z.object({ targetId: z.string(), text: z.string() }),
  ),
});
export type ApprovedTailoring = z.infer<typeof ApprovedTailoringSchema>;
