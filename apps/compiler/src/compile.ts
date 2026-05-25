/**
 * compile.ts — spawn the Typst CLI in a temp dir, return the PDF buffer.
 *
 * Important design points:
 *   - We DO NOT pipe source through stdin. Typst's package resolver needs the
 *     working file to live on disk so `#import "@preview/..."` works.
 *   - We copy the bundled `templates/` directory (helpers + partials + fonts)
 *     into every job so `#import "./partials/..."` works without exposing
 *     repo paths.
 *   - The optional `data` payload is serialised to `resume-data.json` next to
 *     the entrypoint so the template can `json("./resume-data.json")`.
 *   - Temp dirs are always cleaned up.
 */

import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile, readFile, cp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, "templates");
const FONTS_DIR = join(TEMPLATES_DIR, "fonts");

export interface CompileArgs {
  source: string;
  data?: unknown;
  filename?: string;
}

export interface CompileResult {
  pdf: Buffer;
}

export async function compileTypst({ source, data }: CompileArgs): Promise<CompileResult> {
  const work = await mkdtemp(join(tmpdir(), "typst-job-"));
  try {
    // Copy bundled partials + fonts so `#import "./partials/..."` resolves.
    await cp(join(TEMPLATES_DIR, "partials"), join(work, "partials"), { recursive: true });
    await cp(FONTS_DIR, join(work, "fonts"), { recursive: true });

    const sourcePath = join(work, "resume.typ");
    const outPath = join(work, "resume.pdf");

    await writeFile(sourcePath, source, "utf8");

    if (data !== undefined) {
      await writeFile(join(work, "resume-data.json"), JSON.stringify(data, null, 2), "utf8");
    }

    await runTypst([
      "compile",
      "--font-path",
      join(work, "fonts"),
      sourcePath,
      outPath,
    ]);

    const pdf = await readFile(outPath);
    return { pdf };
  } finally {
    rm(work, { recursive: true, force: true }).catch(() => {});
  }
}

function runTypst(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("typst", args, {
      stdio: ["ignore", "pipe", "pipe"],
      // Cache Typst packages between requests inside the container.
      env: { ...process.env, XDG_CACHE_HOME: "/tmp/typst-cache" },
    });

    let stderr = "";
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("error", (err) => {
      const e: Error & { stderr?: string } = err;
      e.stderr = stderr;
      reject(e);
    });
    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        const err: Error & { stderr?: string } = new Error(
          `typst exited with code ${code}`,
        );
        err.stderr = stderr;
        reject(err);
      }
    });
  });
}
