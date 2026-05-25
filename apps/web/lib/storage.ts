/**
 * Storage abstraction. Phase 1 writes to `data/generated/` on the local
 * filesystem; Phase 3 will swap this for S3 / blob storage.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const GENERATED_DIR = join(__dirname, "..", "..", "..", "data", "generated");

export interface SaveArgs {
  filename: string;
  bytes: Buffer;
}

export interface SavedFile {
  path: string;
  relativePath: string;
}

export async function savePdf({ filename, bytes }: SaveArgs): Promise<SavedFile> {
  await mkdir(GENERATED_DIR, { recursive: true });
  const safe = filename.replace(/[^A-Za-z0-9._-]/g, "_");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const finalName = `${stamp}__${safe}`;
  const fullPath = join(GENERATED_DIR, finalName);
  await writeFile(fullPath, bytes);
  return {
    path: fullPath,
    relativePath: `data/generated/${finalName}`,
  };
}

export const PATHS = {
  generatedDir: GENERATED_DIR,
};
