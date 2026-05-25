/**
 * Compiler microservice
 * ---------------------
 * A tiny Fastify HTTP server that compiles arbitrary Typst source to PDF.
 *
 * Endpoints:
 *   GET  /health
 *   POST /compile   { source: string, data?: unknown, filename?: string }
 *
 * Stateless: each request gets a fresh temp directory, the template + sidecar
 * data file are written, `typst compile` runs, the PDF is read back, and the
 * temp directory is deleted before responding.
 *
 * The container ships with the official `typst` binary on PATH.
 */

import Fastify from "fastify";
import { z } from "zod";
import { compileTypst } from "./compile.js";

/**
 * Inline copy of CompileRequestSchema from @resume-tailor/shared-types.
 * Inlined intentionally so the compiled `dist/` runs without needing the
 * workspace's TS sources at runtime. Keep in sync with
 * packages/shared-types/src/typst.ts.
 */
const CompileRequestSchema = z.object({
  source: z.string().min(1),
  data: z.unknown().optional(),
  filename: z.string().default("resume.pdf"),
});

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? "0.0.0.0";

const app = Fastify({
  logger: true,
  bodyLimit: 10 * 1024 * 1024, // 10 MB — Typst sources stay well under this
});

app.get("/health", async () => ({ ok: true, service: "compiler", typst: true }));

app.post("/compile", async (req, reply) => {
  const parsed = CompileRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({
      ok: false,
      error: "Invalid compile request",
      details: parsed.error.flatten(),
    });
  }

  const startedAt = Date.now();
  try {
    const { pdf } = await compileTypst({
      source: parsed.data.source,
      data: parsed.data.data,
      filename: parsed.data.filename,
    });
    const compileMs = Date.now() - startedAt;
    return reply.code(200).send({
      ok: true,
      filename: parsed.data.filename,
      bytes: pdf.length,
      pdfBase64: pdf.toString("base64"),
      compileMs,
    });
  } catch (err: unknown) {
    const e = err as { message?: string; stderr?: string };
    req.log.error({ err: e }, "compile failed");
    return reply.code(500).send({
      ok: false,
      error: e?.message ?? "Unknown compile error",
      stderr: e?.stderr,
    });
  }
});

app
  .listen({ port: PORT, host: HOST })
  .then(() => {
    app.log.info(`Compiler listening on http://${HOST}:${PORT}`);
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
