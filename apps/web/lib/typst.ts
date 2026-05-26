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
  type TemplateId,
} from "@resume-tailor/shared-types";

const COMPILER_URL = process.env.COMPILER_URL ?? "http://localhost:8787";

const __dirname = dirname(fileURLToPath(import.meta.url));

function templatePath(filename: string) {
  return join(__dirname, "..", "..", "compiler", "src", "templates", filename);
}

export async function loadBaseTemplate(): Promise<string> {
  return readFile(templatePath("base-resume.typ"), "utf8");
}

export async function loadBrilliantCvTemplate(): Promise<string> {
  return readFile(templatePath("brilliant-cv.typ"), "utf8");
}

export async function loadTemplate(id: TemplateId): Promise<string> {
  switch (id) {
    case "brilliant-cv":
      return loadBrilliantCvTemplate();
    default:
      return loadBaseTemplate();
  }
}

export interface RenderPayload {
  master: MasterResume;
  selected: SelectedResume & {
    approvedSummary?: string;
    approvedCapabilities?: { id: string; text: string }[];
  };
}

export async function compilePdf(args: {
  source: string;
  data: RenderPayload;
  filename?: string;
  template?: TemplateId;
}): Promise<CompileResponse> {
  const res = await fetch(`${COMPILER_URL}/compile`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      source: args.source,
      data: args.data,
      filename: args.filename ?? "resume.pdf",
      template: args.template ?? "neat-cv",
    }),
  });

  const json = await res.json();
  const parsed = CompileResponseSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, error: `Invalid compiler response: ${parsed.error.message}` };
  }
  return parsed.data;
}
