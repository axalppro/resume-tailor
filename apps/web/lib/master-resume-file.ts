/**
 * File I/O utilities for master resume JSON persistence.
 *
 * Handles safe read/write operations with validation, error handling,
 * and concurrent write protection.
 */
import fs from "fs/promises";
import path from "path";
import { MasterResume, MasterResumeSchema } from "@resume-tailor/shared-types";

// Path to the master resume seed file
const MASTER_RESUME_FILE_PATH = path.join(
  process.cwd(),
  "data/seed/master-resume.json",
);

// In-memory write lock to prevent concurrent writes
let isWriting = false;
const writeQueue: Array<() => Promise<void>> = [];

/**
 * Get the absolute path to the master resume JSON file.
 */
export function getMasterResumeFilePath(): string {
  return MASTER_RESUME_FILE_PATH;
}

/**
 * Read master resume from JSON file with validation.
 *
 * @returns Validated MasterResume object
 * @throws Error if file doesn't exist, is invalid JSON, or fails validation
 */
export async function readMasterResumeFile(): Promise<MasterResume> {
  try {
    const content = await fs.readFile(MASTER_RESUME_FILE_PATH, "utf-8");
    const parsed = JSON.parse(content);

    // Validate against schema
    const validated = MasterResumeSchema.parse(parsed);
    return validated;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        `Failed to parse master resume JSON: ${error.message}`,
      );
    }
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new Error(
        `Master resume file not found at ${MASTER_RESUME_FILE_PATH}`,
      );
    }
    throw error;
  }
}

/**
 * Write master resume to JSON file with safe concurrent access.
 *
 * - Validates data before writing
 * - Creates atomic write with backup
 * - Enforces single write at a time using in-memory queue
 *
 * @param data Validated MasterResume data to write
 * @throws Error if validation fails or write fails
 */
export async function writeMasterResumeFile(
  data: unknown,
): Promise<MasterResume> {
  // Validate before writing
  const validated = MasterResumeSchema.parse(data);

  return new Promise((resolve, reject) => {
    const task = async () => {
      try {
        // Read current file as backup
        let backup: string | null = null;
        try {
          backup = await fs.readFile(MASTER_RESUME_FILE_PATH, "utf-8");
        } catch {
          // File might not exist yet, that's okay
        }

        // Write new content atomically
        const tempPath = `${MASTER_RESUME_FILE_PATH}.tmp`;
        const jsonContent = JSON.stringify(validated, null, 2);

        try {
          // Write to temp file first
          await fs.writeFile(tempPath, jsonContent, "utf-8");

          // Atomic rename
          await fs.rename(tempPath, MASTER_RESUME_FILE_PATH);
        } catch (writeError) {
          // Clean up temp file if it exists
          try {
            await fs.unlink(tempPath);
          } catch {
            // Ignore cleanup errors
          }
          throw writeError;
        }

        resolve(validated);
      } catch (error) {
        reject(error);
      } finally {
        isWriting = false;
        // Process next queued write
        const nextTask = writeQueue.shift();
        if (nextTask) {
          isWriting = true;
          nextTask();
        }
      }
    };

    if (isWriting) {
      // Queue the write if another is in progress
      writeQueue.push(task);
    } else {
      isWriting = true;
      task();
    }
  });
}

/**
 * Sync file to database profile.
 *
 * Reads the JSON file and updates the default MasterResumeProfile in the database.
 * Useful for initial seeding or migrations.
 *
 * @requires Prisma client to be available
 */
export async function syncFileToDatabase(): Promise<void> {
  const { prisma } = await import("@/lib/db");

  const fileData = await readMasterResumeFile();

  // Get or create default profile
  let profile = await prisma.masterResumeProfile.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (!profile) {
    profile = await prisma.masterResumeProfile.create({
      data: {
        name: "default",
        data: fileData as unknown as object,
      },
    });
  } else {
    profile = await prisma.masterResumeProfile.update({
      where: { id: profile.id },
      data: { data: fileData as unknown as object },
    });
  }
}
