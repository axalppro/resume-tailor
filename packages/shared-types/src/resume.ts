import { z } from "zod";

/**
 * MASTER RESUME — the canonical, richer-than-final database of every truthful
 * fact about the candidate. The final, tailored resume is always a curated
 * SNAPSHOT of selections drawn from this pool.
 *
 * Mirrors apps/web/prisma/schema.prisma at the structural level.
 */

export const BasicsSchema = z.object({
  first_name: z.string(),
  last_name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  website: z.string().url().optional().or(z.literal("")),
  linkedin: z.string().optional().or(z.literal("")),
  location: z.string(),
});
export type Basics = z.infer<typeof BasicsSchema>;

export const HeadlineVariantSchema = z.object({
  id: z.string(),
  text: z.string(),
});

export const ProfileVariantSchema = z.object({
  id: z.string(),
  text: z.string(),
});

export const CapabilitySchema = z.object({
  id: z.string(),
  text: z.string(),
  tags: z.array(z.string()).default([]),
});

const YearOrPresent = z.union([z.number().int(), z.literal("Present"), z.string()]);

/**
 * ExperienceBullet — a single, structured bullet on an experience entry.
 *
 * Phase 3.6: simplified back to `{id, text}` only. The keyword sub-line is
 * now per-ROLE (consolidated into `approvedExperienceTags[]`) rather than
 * per-bullet — cleaner information architecture, less visual noise on the
 * page, and a 1:1 match with brilliant-CV's `cv-entry(tags: (...))` API for
 * the upcoming Phase 4 template port.
 *
 * Bullets still accept either the new `{id,text}` shape or a legacy
 * `string[]` form; callers must go through `normalizeBullets(e.bullets, e.id)`
 * instead of destructuring `bullets` directly.
 */
export const ExperienceBulletSchema = z.object({
  id: z.string(),
  text: z.string(),
});
export type ExperienceBullet = z.infer<typeof ExperienceBulletSchema>;

export const ExperienceBulletInputSchema = z.union([
  z.string(),
  ExperienceBulletSchema,
]);

export const ExperienceSchema = z.object({
  id: z.string(),
  title: z.string(),
  org: z.string(),
  location: z.string().optional().default(""),
  start_year: YearOrPresent,
  end_year: YearOrPresent.optional(),
  keywords: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  /**
   * Bullets accept legacy `string[]` (Phase 1–2) OR new structured
   * `ExperienceBullet[]` (Phase 3.5+). Always go through `normalizeBullets()`
   * when reading.
   */
  bullets: z.array(ExperienceBulletInputSchema).optional().default([]),
});
export type Experience = z.infer<typeof ExperienceSchema>;

/**
 * Normalize an Experience.bullets value (legacy `string[]` OR new
 * `{id,text,keywords[]}[]`) into the canonical structured form. Synthesises
 * deterministic ids using the experience id + index when needed.
 */
export function normalizeBullets(
  bullets: Experience["bullets"] | undefined,
  experienceId: string,
): ExperienceBullet[] {
  if (!bullets || bullets.length === 0) return [];
  return bullets.map((b, i) => {
    if (typeof b === "string") {
      return { id: `${experienceId}#${i}`, text: b };
    }
    return {
      id: b.id || `${experienceId}#${i}`,
      text: b.text,
    };
  });
}

export const EducationSchema = z.object({
  id: z.string(),
  title: z.string(),
  institution: z.string(),
  location: z.string().optional().default(""),
  start_year: YearOrPresent,
  end_year: YearOrPresent.optional(),
  keywords: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
});

export const ProjectSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string().optional().default(""),
  location: z.string().optional().default(""),
  start_year: YearOrPresent,
  end_year: YearOrPresent.optional(),
  keywords: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
});

export const LanguageSchema = z.object({
  id: z.string(),
  name: z.string(),
  level: z.string(),
  tags: z.array(z.string()).default([]),
});

export const CertificationSchema = z.object({
  id: z.string(),
  title: z.string(),
  issuer: z.string().optional().default(""),
  year: YearOrPresent.optional(),
  tags: z.array(z.string()).default([]),
});

export const AdditionalExperienceSchema = ExperienceSchema;

export const MasterResumeSchema = z.object({
  basics: BasicsSchema,
  headline_variants: z.array(HeadlineVariantSchema),
  profile_variants: z.array(ProfileVariantSchema),
  capability_pool: z.array(CapabilitySchema),
  experience: z.array(ExperienceSchema),
  education: z.array(EducationSchema),
  projects: z.array(ProjectSchema),
  languages: z.array(LanguageSchema),
  certifications: z.array(CertificationSchema).default([]),
  additional_experience: z.array(AdditionalExperienceSchema).default([]),
});
export type MasterResume = z.infer<typeof MasterResumeSchema>;

/**
 * SelectedResume — the curated subset that is actually rendered to PDF.
 * Each list holds IDs that point into the master pool.
 */
export const SelectedResumeSchema = z.object({
  headline: z.string(),
  profile: z.string(),
  capabilities: z.array(z.string()).default([]),
  experience: z.array(z.string()).default([]),
  education: z.array(z.string()).default([]),
  projects: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
  certifications: z.array(z.string()).default([]),
  additional_experience: z.array(z.string()).default([]),
});
export type SelectedResume = z.infer<typeof SelectedResumeSchema>;

/**
 * ContentBlock — DB-level abstraction. Every atom that can appear on a resume
 * is represented as a ContentBlock so the tailoring/selection UI can operate
 * uniformly over them.
 */
export const ContentBlockTypeSchema = z.enum([
  "summary_variant",
  "capability_bullet",
  "experience_entry",
  "experience_bullet",
  "project",
  "education",
  "certification",
  "language",
  "additional_experience",
  "optional_section",
]);
export type ContentBlockType = z.infer<typeof ContentBlockTypeSchema>;

export const ContentBlockSchema = z.object({
  id: z.string(),
  type: ContentBlockTypeSchema,
  title: z.string(),
  content: z.string(),
  tags: z.array(z.string()).default([]),
  defaultPriority: z.number().int().default(50),
  truthSource: z.string().describe("Where this fact came from (e.g. master JSON, manual entry)."),
  active: z.boolean().default(true),
  /**
   * `refId` — points to the underlying entity in MasterResume (e.g. an
   * experience id, project id, language id). Lets us reconstitute selections
   * back into the Typst-ready structured form.
   */
  refId: z.string().optional(),
});
export type ContentBlock = z.infer<typeof ContentBlockSchema>;
