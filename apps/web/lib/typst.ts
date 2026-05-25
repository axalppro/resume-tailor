/**
 * Helpers for talking to the compiler microservice and for synthesising the
 * Typst source string the service consumes.
 */
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CompileResponseSchema,
  type CompileResponse,
  type MasterResume,
  type SelectedResume,
} from "@resume-tailor/shared-types";

const COMPILER_URL = process.env.COMPILER_URL ?? "http://localhost:8787";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Read the bundled base template. The compiler container ships with its own
 * copy of `/templates`, so on the wire we only need to send the entrypoint
 * source. The partials referenced via `#import "./partials/..."` resolve
 * inside the container against its bundled copy.
 */
export async function loadBaseTemplate(): Promise<string> {
  const path = join(
    __dirname,
    "..",
    "..",
    "compiler",
    "src",
    "templates",
    "base-resume.typ",
  );
  return readFile(path, "utf8");
}

export interface RenderPayload {
  master: MasterResume;
  /**
   * Selected IDs + optional approved AI rewrites. The template prefers
   * `approvedSummary` / `approvedCapabilities` over master-lookup-by-id when
   * present.
   */
  selected: SelectedResume & {
    approvedSummary?: string;
    approvedCapabilities?: { id: string; text: string }[];
  };
}

export async function compilePdf(args: {
  source: string;
  data: RenderPayload;
  filename?: string;
}): Promise<CompileResponse> {
  const res = await fetch(`${COMPILER_URL}/compile`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      source: args.source,
      data: args.data,
      filename: args.filename ?? "resume.pdf",
    }),
  });

  const json = await res.json();
  const parsed = CompileResponseSchema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      error: `Invalid compiler response: ${parsed.error.message}`,
    };
  }
  return parsed.data;
}
