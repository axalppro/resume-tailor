import { z } from "zod";

/**
 * JobOffer — what the user pastes / uploads. Stored verbatim, then parsed into
 * `JobSignals` by the AI pipeline (Phase 2 will call an LLM; Phase 1 returns
 * a deterministic mock).
 */

export const JobOfferSourceSchema = z.enum(["paste", "upload", "url"]);
export type JobOfferSource = z.infer<typeof JobOfferSourceSchema>;

export const JobOfferCreateSchema = z.object({
  title: z.string().min(1, "Title required"),
  company: z.string().min(1, "Company required"),
  source: JobOfferSourceSchema.default("paste"),
  rawText: z.string().min(1, "Job offer text required"),
  url: z.string().url().optional(),
});
export type JobOfferCreate = z.infer<typeof JobOfferCreateSchema>;

/**
 * JobSignals — strict structured output of the parse-job LLM step.
 * This schema is the validation contract that any LLM response MUST satisfy.
 */
export const JobSignalsSchema = z.object({
  keywords: z.array(z.string()).describe("Salient keywords from the JD."),
  requiredSkills: z.array(z.string()).describe("Skills explicitly listed as required."),
  preferredSkills: z.array(z.string()).describe("Skills listed as nice-to-have."),
  roleThemes: z.array(z.string()).describe("High-level themes (e.g. 'embedded systems', 'IoT')."),
  suggestedEmphasis: z
    .array(z.string())
    .describe("Areas the candidate should emphasise in their tailored resume."),
});
export type JobSignals = z.infer<typeof JobSignalsSchema>;
