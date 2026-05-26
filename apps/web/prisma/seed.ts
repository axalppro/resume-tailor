/**
 * Prisma seed
 * -----------
 * Loads `data/seed/master-resume.json` into MasterResumeProfile and explodes
 * its sub-arrays into ContentBlock rows so the tailoring/selection UI has a
 * uniform model to work against.
 *
 * Idempotent: re-running deletes existing seed data and re-creates it.
 */

import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  MasterResumeSchema,
  type MasterResume,
  normalizeBullets,
} from "@resume-tailor/shared-types";

const prisma = new PrismaClient();

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_PATH = join(__dirname, "..", "..", "..", "data", "seed", "master-resume.json");

const SEED_PROFILE_NAME = "Aurélien Rithner — Master";

async function main() {
  const raw = JSON.parse(await readFile(SEED_PATH, "utf8"));
  const master: MasterResume = MasterResumeSchema.parse(raw);

  // Clean previous seed of the same name.
  await prisma.masterResumeProfile.deleteMany({ where: { name: SEED_PROFILE_NAME } });

  const profile = await prisma.masterResumeProfile.create({
    data: {
      name: SEED_PROFILE_NAME,
      data: master as unknown as object,
    },
  });

  // Explode into ContentBlocks.
  const blocks: {
    profileId: string;
    type: string;
    title: string;
    content: string;
    tags: string[];
    defaultPriority: number;
    truthSource: string;
    active: boolean;
    refId?: string | null;
  }[] = [];

  for (const p of master.profile_variants) {
    blocks.push({
      profileId: profile.id,
      type: "summary_variant",
      title: p.id,
      content: p.text,
      tags: [],
      defaultPriority: 50,
      truthSource: "master_resume.profile_variants",
      active: true,
      refId: p.id,
    });
  }
  for (const c of master.capability_pool) {
    blocks.push({
      profileId: profile.id,
      type: "capability_bullet",
      title: c.id,
      content: c.text,
      tags: c.tags,
      defaultPriority: 60,
      truthSource: "master_resume.capability_pool",
      active: true,
      refId: c.id,
    });
  }
  for (const e of master.experience) {
    blocks.push({
      profileId: profile.id,
      type: "experience_entry",
      title: `${e.title} — ${e.org}`,
      content: e.keywords.join(" · "),
      tags: e.tags,
      defaultPriority: 80,
      truthSource: "master_resume.experience",
      active: true,
      refId: e.id,
    });
    // Phase 3.5: bullets may be legacy `string[]` or structured
    // `{id,text,keywords[]}` — normalize both before exploding into
    // ContentBlocks so the search / tailoring pipeline only ever sees the
    // canonical text form here.
    const normalisedBullets = normalizeBullets(e.bullets, e.id);
    for (const [i, b] of normalisedBullets.entries()) {
      blocks.push({
        profileId: profile.id,
        type: "experience_bullet",
        title: b.id,
        content: b.text,
        // Per-bullet keywords first; fall back to entry-level keywords for
        // legacy bullets that don't carry their own list yet.
        tags: b.keywords.length > 0 ? b.keywords : e.tags,
        defaultPriority: 70,
        truthSource: `master_resume.experience.${e.id}.bullets.${i}`,
        active: true,
        refId: b.id,
      });
    }
  }
  for (const e of master.education) {
    blocks.push({
      profileId: profile.id,
      type: "education",
      title: `${e.title} — ${e.institution}`,
      content: e.keywords.join(" · "),
      tags: e.tags,
      defaultPriority: 65,
      truthSource: "master_resume.education",
      active: true,
      refId: e.id,
    });
  }
  for (const p of master.projects) {
    blocks.push({
      profileId: profile.id,
      type: "project",
      title: `${p.title} — ${p.subtitle ?? ""}`.trim().replace(/—\s*$/, ""),
      content: p.keywords.join(" · "),
      tags: p.tags,
      defaultPriority: 55,
      truthSource: "master_resume.projects",
      active: true,
      refId: p.id,
    });
  }
  for (const l of master.languages) {
    blocks.push({
      profileId: profile.id,
      type: "language",
      title: `${l.name} (${l.level})`,
      content: l.level,
      tags: l.tags,
      defaultPriority: 40,
      truthSource: "master_resume.languages",
      active: true,
      refId: l.id,
    });
  }
  for (const c of master.certifications) {
    blocks.push({
      profileId: profile.id,
      type: "certification",
      title: c.title,
      content: c.issuer ?? "",
      tags: c.tags,
      defaultPriority: 50,
      truthSource: "master_resume.certifications",
      active: true,
      refId: c.id,
    });
  }
  for (const a of master.additional_experience) {
    blocks.push({
      profileId: profile.id,
      type: "additional_experience",
      title: `${a.title} — ${a.org}`,
      content: a.keywords.join(" · "),
      tags: a.tags,
      defaultPriority: 45,
      truthSource: "master_resume.additional_experience",
      active: true,
      refId: a.id,
    });
  }

  await prisma.contentBlock.createMany({ data: blocks });

  console.log(
    `Seed complete. Profile: ${profile.name} (${profile.id}). ContentBlocks: ${blocks.length}.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
