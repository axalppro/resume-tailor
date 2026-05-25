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
