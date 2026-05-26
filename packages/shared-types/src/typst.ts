import { z } from "zod";

export const TemplateIdSchema = z.enum(["neat-cv", "brilliant-cv"]);
export type TemplateId = z.infer<typeof TemplateIdSchema>;

export const TEMPLATES = [
  { id: "neat-cv", label: "Neat CV", description: "Clean two-column layout. Current default.", accent: "#2642a4" },
  { id: "brilliant-cv", label: "Brilliant CV", description: "Modular Typst CV template with profile metadata.", accent: "skyblue" },
] as const satisfies ReadonlyArray<{ id: TemplateId; label: string; description: string; accent: string }>;

/**
 * The payload sent to the compiler microservice. The service is intentionally
 * stateless and content-agnostic — it receives raw Typst source plus an
 * optional `data` blob that will be serialised to `resume-data.json` next to
 * the template and made available to the template via `json(...)`.
 */
export const CompileRequestSchema = z.object({
  /** Raw `.typ` source as a string. */
  source: z.string().min(1),
  /**
   * Optional structured data. If present, the compiler writes it to
   * `resume-data.json` alongside the template before invoking `typst compile`,
   * so the template can `#let data = json("./resume-data.json")`.
   */
  data: z.unknown().optional(),
  /** Optional filename hint, surfaced in logs and the response. */
  filename: z.string().default("resume.pdf"),
  template: TemplateIdSchema.default("neat-cv"),
});
export type CompileRequest = z.infer<typeof CompileRequestSchema>;

export const CompileSuccessSchema = z.object({
  ok: z.literal(true),
  filename: z.string(),
  /** base64-encoded PDF for easy JSON transport. */
  pdfBase64: z.string(),
  bytes: z.number().int(),
  compileMs: z.number(),
});

export const CompileErrorSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
  stderr: z.string().optional(),
});

export const CompileResponseSchema = z.discriminatedUnion("ok", [
  CompileSuccessSchema,
  CompileErrorSchema,
]);
export type CompileResponse = z.infer<typeof CompileResponseSchema>;
