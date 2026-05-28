"use client";

/**
 * TailoringSession — the Phase 2 single-page tailoring UI.
 * --------------------------------------------------------
 * Pipeline (matches the project brief, top to bottom):
 *
 *   1. Job offer card (collapsed by default)
 *   2. "Parse with AI" → signals card
 *   3. "Tailor with AI" → fills summary + capabilities + bullet rewrites
 *   4. Summary review (radio: original / AI / custom)
 *   5. Capabilities ranked list with checkboxes + up/down reorder
 *   6. Bullet rewrites (radio: original / AI / custom per bullet)
 *   7. Optional sections (checkbox picker, manual-only block types)
 *   8. Footer with "Save draft" + "Generate PDF" buttons
 *   9. PDF preview (only after first generate)
 *
 * Whitelist enforcement is structural: the only AI-editable artefacts visible
 * here are summary, capabilities, and individual experience bullets. Education
 * / projects / certifications / languages / additional are pure checkbox lists
 * — AI is allowed to *recommend* them but never to rephrase their content.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ApprovedBulletRewrite,
  ApprovedCapability,
  ApprovedExperienceTags,
  ApprovedTailoring,
  ContentBlockType,
  JobSignals,
  MasterResume,
  SuggestedEdit,
  TailorResponse,
  TemplateId,
} from "@resume-tailor/shared-types";
import { SkillsRanked, type SkillSuggestion } from "./skills-ranked";
import { SummaryReview } from "./summary-review";
import { BulletPicker } from "./bullet-picker";
import { ExperienceTagsEditor } from "./experience-tags-editor";
import { CheckboxSectionPicker } from "./checkbox-section-picker";
import { PDFPreview } from "./pdf-preview";

interface JobOfferLite {
  id: string;
  title: string;
  company: string;
  rawText: string;
  signals: unknown;
}

interface InitialSession {
  id: string;
  status: string;
  suggestions: unknown;
  approved: unknown;
}

interface Props {
  jobOffer: JobOfferLite;
  master: MasterResume;
  masterResumeId: string;
  initialSession: InitialSession | null;
}

const MANUAL_BLOCK_TYPES: ContentBlockType[] = [
  "education",
  "project",
  "language",
  "certification",
  "additional_experience",
];

export function TailoringSession({
  jobOffer,
  master,
  masterResumeId,
  initialSession,
}: Props) {
  // ---------------------------------------------------------------- state
  const [rawTextOpen, setRawTextOpen] = useState(false);
  const [signals, setSignals] = useState<JobSignals | null>(
    (jobOffer.signals as JobSignals | null) ?? null,
  );
  const [tailorResponse, setTailorResponse] = useState<TailorResponse | null>(
    (initialSession?.suggestions as TailorResponse | null) ?? null,
  );
  const [sessionId, setSessionId] = useState<string | null>(initialSession?.id ?? null);

  const [parsing, setParsing] = useState(false);
  const [tailoring, setTailoring] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Approved-content state (driven by the children's onChange callbacks)
  const [approvedSummary, setApprovedSummary] = useState<string>("");
  const [approvedCapabilities, setApprovedCapabilities] = useState<
    ApprovedCapability[]
  >([]);
  const [approvedBullets, setApprovedBullets] = useState<
    ApprovedBulletRewrite[]
  >([]);
  const [approvedExperienceTags, setApprovedExperienceTags] = useState<
    ApprovedExperienceTags[]
  >([]);
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);
  const [template, setTemplate] = useState<TemplateId>("neat-cv");
  const [showProfilePhoto, setShowProfilePhoto] = useState(false);

  // PDF preview
  const [pdf, setPdf] = useState<{ base64: string; filename: string; pageCount?: number } | null>(
    null,
  );

  // Recommended-mode pipeline progress strip. Each step is shown as a chip
  // that lights up while running and turns green when it succeeds.
  type StepKey = "parse" | "tailor" | "approve" | "typst" | "compile";
  type StepState = "idle" | "running" | "done" | "error";
  const [recommendedRunning, setRecommendedRunning] = useState(false);
  const [steps, setSteps] = useState<Record<StepKey, StepState>>({
    parse: "idle",
    tailor: "idle",
    approve: "idle",
    typst: "idle",
    compile: "idle",
  });

  // ------------------------------------------------------------- defaults
  const defaultSummary = useMemo(
    () => master.profile_variants[0]?.text ?? "",
    [master],
  );
  const defaultHeadline = useMemo(
    () => master.headline_variants[0]?.text ?? "",
    [master],
  );

  // Hydrate from existing approved JSON on first mount (if user previously
  // saved a draft for this job offer).
  //
  // CRITICAL: this effect MUST run exactly once per mount. The parent is a
  // Server Component with force-dynamic, so `initialSession` is a brand-new
  // object reference on every parent re-render — making `[initialSession]`
  // as deps would re-fire on every RSC refresh, calling setApprovedX, which
  // re-renders this component, which propagates fresh `recommendations`/
  // `suggestions` arrays to CheckboxSectionPicker / CapabilitiesRanked /
  // DirectivesEditor children whose own `[initial]` resync effects then loop
  // back into our setState. That cascade was the `Maximum update depth
  // exceeded` crash that locked out clicks on the textboxes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const a = initialSession?.approved as Partial<ApprovedTailoring> | null;
    if (!a) return;
    if (a.approvedSummary) setApprovedSummary(a.approvedSummary);
    if (a.approvedCapabilities) {
      // Phase 3.6 clean break: ApprovedCapability is always {id,title,details}.
      // Old sessions are wiped by `prisma migrate reset`, so we assert directly.
      setApprovedCapabilities(
        a.approvedCapabilities.map((c) => ({
          id: c.id,
          title: c.title,
          details: c.details,
        })),
      );
    }
    if (a.approvedBulletRewrites) {
      setApprovedBullets(
        a.approvedBulletRewrites.map((b) => ({
          targetId: b.targetId,
          experienceId: b.experienceId,
          text: b.text,
          included: b.included ?? true,
        })),
      );
    }
    if (a.approvedExperienceTags) {
      setApprovedExperienceTags(
        a.approvedExperienceTags.map((t) => ({
          experienceId: t.experienceId,
          tags: t.tags ?? [],
        })),
      );
    }
    // a.selected is intentionally not applied here — CheckboxSectionPicker
    // re-seeds from its own `recommendations` prop. See its safety comment.
  }, []);

  // -------------------------------------------------------- API callbacks
  async function runParse() {
    setParsing(true);
    setError(null);
    try {
      const res = await fetch("/api/parse-job", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobOfferId: jobOffer.id }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Parse failed");
      setSignals(json.signals);
      setInfo(`Parsed in ${json.trace?.ms ?? "?"} ms${json.trace?.mocked ? " (mock)" : ""}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setParsing(false);
    }
  }

  async function runTailor() {
    if (!signals) {
      setError("Parse the job offer first.");
      return;
    }
    setTailoring(true);
    setError(null);
    try {
      const res = await fetch("/api/tailor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobOfferId: jobOffer.id, masterResumeId }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Tailor failed");
      setTailorResponse(json.response as TailorResponse);
      setSessionId(json.response.sessionId);
      setInfo(
        `Tailored — ${json.traces?.length ?? 0} LLM call(s)` +
          (json.traces?.[0]?.mocked ? " (mock)" : ""),
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setTailoring(false);
    }
  }

  const buildApproved = useCallback((): ApprovedTailoring => {
    // Map selected block IDs back to the BlockRecommendation entry so we can
    // read its `refId` — which is the id of the underlying master-resume
    // entity (project.id / education.id / language.id / …). The Typst
    // renderer resolves all section bodies by id, so passing anything other
    // than refId produces a header with no rows underneath (the Phase 2
    // "section appears but is empty" bug).
    const blockById = new Map(
      (tailorResponse?.recommendedBlocks ?? []).map((b) => [b.blockId, b]),
    );

    const selected: ApprovedTailoring["selected"] = {
      headline: defaultHeadline,
      profile: master.profile_variants[0]?.id ?? "",
      capabilities: approvedCapabilities.map((c) => c.id),
      experience: master.experience.map((e) => e.id), // experience entries are always-on
      education: [],
      projects: [],
      languages: [],
      certifications: [],
      additional_experience: [],
    };

    for (const id of selectedBlockIds) {
      const blk = blockById.get(id);
      if (!blk) continue;
      if (!blk.refId) {
        // Older sessions (pre-fix) may lack refId on persisted recommendations.
        // We can't safely guess; skip with a console warning so it's visible
        // during testing.
        // eslint-disable-next-line no-console
        console.warn(
          `Block ${blk.blockId} (${blk.blockType} — ${blk.title}) has no refId; ` +
            `skipping. Re-run "Tailor with AI" to regenerate recommendations.`,
        );
        continue;
      }
      switch (blk.blockType) {
        case "education":
          selected.education.push(blk.refId);
          break;
        case "project":
          selected.projects.push(blk.refId);
          break;
        case "language":
          selected.languages.push(blk.refId);
          break;
        case "certification":
          selected.certifications.push(blk.refId);
          break;
        case "additional_experience":
          selected.additional_experience.push(blk.refId);
          break;
      }
    }

    return {
      selected,
      approvedSummary: approvedSummary || defaultSummary,
      approvedCapabilities,
      approvedBulletRewrites: approvedBullets,
      approvedExperienceTags,
    };
  }, [
    tailorResponse,
    selectedBlockIds,
    approvedCapabilities,
    approvedSummary,
    approvedBullets,
    approvedExperienceTags,
    master,
    defaultHeadline,
    defaultSummary,
  ]);

  async function saveDraft() {
    if (!sessionId) {
      setError("Run 'Tailor with AI' first to create a session.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const approved = buildApproved();
      const res = await fetch(`/api/tailoring-sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ approved, status: "draft" }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Save failed");
      setInfo("Draft saved.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function generatePdf() {
    if (!sessionId) {
      setError("Run 'Tailor with AI' first.");
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const approved = buildApproved();

      // 1. Build Typst source + payload
      const typstRes = await fetch("/api/generate-typst", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ masterResumeId, approved, template, showProfilePhoto }),
      });
      const typstJson = await typstRes.json();
      if (!typstJson.ok) throw new Error(typstJson.error ?? "Typst gen failed");

      // 2. Compile PDF + persist
      const pdfRes = await fetch("/api/compile-pdf", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source: typstJson.source,
          data: typstJson.data,
          filename: typstJson.filename,
          persist: { jobOfferId: jobOffer.id, masterResumeId, sessionId },
        }),
      });
      const pdfJson = await pdfRes.json();
      if (!pdfJson.ok) throw new Error(pdfJson.error ?? "Compile failed");

      setPdf({
        base64: pdfJson.pdfBase64,
        filename: pdfJson.filename,
        pageCount: pdfJson.pageCount,
      });

      // 3. Save approved + mark session as rendered
      await fetch(`/api/tailoring-sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ approved, status: "rendered" }),
      });

      setInfo(`Generated ${pdfJson.bytes} bytes in ${pdfJson.compileMs} ms.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  // ====================================================================
  // Recommended mode — one-click pipeline.
  // Reuses the same API routes the manual buttons hit (parse-job, tailor,
  // generate-typst, compile-pdf, tailoring-sessions PATCH). The only
  // difference is the approval payload: we auto-build it from the AI's
  // suggested defaults instead of waiting for the user to click radios.
  // ====================================================================
  function autoBuildApproved(
    tr: TailorResponse,
    signalsForFallback: JobSignals | null,
  ): ApprovedTailoring {
    void signalsForFallback;
    const blockById = new Map(tr.recommendedBlocks.map((b) => [b.blockId, b]));

    // Auto-select every block the AI marked recommendedDefault.
    const autoSelectedIds = tr.recommendedBlocks
      .filter((b) => b.recommendedDefault)
      .map((b) => b.blockId);

    const selected: ApprovedTailoring["selected"] = {
      headline: defaultHeadline,
      profile: master.profile_variants[0]?.id ?? "",
      capabilities: tr.suggestedCapabilities.map((c) => c.id),
      experience: master.experience.map((e) => e.id),
      education: [],
      projects: [],
      languages: [],
      certifications: [],
      additional_experience: [],
    };

    for (const id of autoSelectedIds) {
      const blk = blockById.get(id);
      if (!blk || !blk.refId) continue;
      switch (blk.blockType) {
        case "education":
          selected.education.push(blk.refId);
          break;
        case "project":
          selected.projects.push(blk.refId);
          break;
        case "language":
          selected.languages.push(blk.refId);
          break;
        case "certification":
          selected.certifications.push(blk.refId);
          break;
        case "additional_experience":
          selected.additional_experience.push(blk.refId);
          break;
      }
    }

    // Phase 3.6: suggestedCapabilities is now plain TailoredSkill[].
    const approvedCaps: ApprovedCapability[] = tr.suggestedCapabilities.map(
      (c) => ({ id: c.id, title: c.title, details: c.details }),
    );

    return {
      selected,
      approvedSummary: tr.suggestedSummary,
      approvedCapabilities: approvedCaps,
      approvedBulletRewrites: tr.bulletRewrites.map((b) => ({
        targetId: b.targetId,
        experienceId: b.experienceId,
        text: b.suggested,
        included: true,
      })),
      approvedExperienceTags: tr.experienceTags.map((t) => ({
        experienceId: t.experienceId,
        tags: t.tags,
      })),
    };
  }

  function resetSteps() {
    setSteps({
      parse: "idle",
      tailor: "idle",
      approve: "idle",
      typst: "idle",
      compile: "idle",
    });
  }

  async function runRecommended() {
    setRecommendedRunning(true);
    setError(null);
    setInfo(null);
    resetSteps();

    const setStep = (k: StepKey, s: StepState) =>
      setSteps((prev) => ({ ...prev, [k]: s }));

    try {
      // ---- Step 1: parse (skip if already parsed) -----------------------
      setStep("parse", "running");
      let workingSignals: JobSignals | null = signals;
      if (!workingSignals) {
        const r = await fetch("/api/parse-job", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ jobOfferId: jobOffer.id }),
        });
        const j = await r.json();
        if (!j.ok) throw new Error(j.error ?? "Parse failed");
        workingSignals = j.signals as JobSignals;
        setSignals(workingSignals);
      }
      setStep("parse", "done");

      // ---- Step 2: tailor ----------------------------------------------
      setStep("tailor", "running");
      const tRes = await fetch("/api/tailor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobOfferId: jobOffer.id, masterResumeId }),
      });
      const tJson = await tRes.json();
      if (!tJson.ok) throw new Error(tJson.error ?? "Tailor failed");
      const tr = tJson.response as TailorResponse;
      setTailorResponse(tr);
      setSessionId(tr.sessionId);
      setStep("tailor", "done");

      // ---- Step 3: auto-approve AI defaults ----------------------------
      setStep("approve", "running");
      const approved = autoBuildApproved(tr, workingSignals);
      // Mirror the local UI state so the editors reflect what was approved.
      setApprovedSummary(approved.approvedSummary);
      setApprovedCapabilities(approved.approvedCapabilities);
      setApprovedBullets(approved.approvedBulletRewrites);
      setApprovedExperienceTags(approved.approvedExperienceTags);
      setSelectedBlockIds(
        tr.recommendedBlocks.filter((b) => b.recommendedDefault).map((b) => b.blockId),
      );
      setStep("approve", "done");

      // ---- Step 4: build Typst payload ---------------------------------
      setStep("typst", "running");
      const typstRes = await fetch("/api/generate-typst", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ masterResumeId, approved, template, showProfilePhoto }),
      });
      const typstJson = await typstRes.json();
      if (!typstJson.ok) throw new Error(typstJson.error ?? "Typst gen failed");
      setStep("typst", "done");

      // ---- Step 5: compile PDF + persist -------------------------------
      setStep("compile", "running");
      const pdfRes = await fetch("/api/compile-pdf", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source: typstJson.source,
          data: typstJson.data,
          filename: typstJson.filename,
          persist: { jobOfferId: jobOffer.id, masterResumeId, sessionId: tr.sessionId },
        }),
      });
      const pdfJson = await pdfRes.json();
      if (!pdfJson.ok) throw new Error(pdfJson.error ?? "Compile failed");
      setPdf({
        base64: pdfJson.pdfBase64,
        filename: pdfJson.filename,
        pageCount: pdfJson.pageCount,
      });

      // Persist approved + mark session rendered.
      await fetch(`/api/tailoring-sessions/${tr.sessionId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ approved, status: "rendered" }),
      });
      setStep("compile", "done");

      setInfo(
        `Recommended pipeline done — ${pdfJson.bytes} bytes in ${pdfJson.compileMs} ms.`,
      );
    } catch (err) {
      setSteps((prev) => {
        const next = { ...prev };
        for (const k of Object.keys(next) as StepKey[]) {
          if (next[k] === "running") next[k] = "error";
        }
        return next;
      });
      setError((err as Error).message);
    } finally {
      setRecommendedRunning(false);
    }
  }

  // ---------------------------------------------------------------- derived
  const bulletEditsForReview: SuggestedEdit[] = tailorResponse?.bulletRewrites ?? [];
  const optionalBlocks = (tailorResponse?.recommendedBlocks ?? []).filter((r) =>
    MANUAL_BLOCK_TYPES.includes(r.blockType),
  );

  return (
    <div className="space-y-6">
      {/* ============================================ Job offer card */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Job offer
            </h2>
            <p className="text-sm text-slate-600">
              {jobOffer.rawText.length.toLocaleString()} characters
            </p>
          </div>
          <button
            onClick={() => setRawTextOpen((v) => !v)}
            className="rounded-md border border-slate-300 px-3 py-1 text-xs hover:bg-slate-100"
          >
            {rawTextOpen ? "Hide raw text" : "Show raw text"}
          </button>
        </div>
        {rawTextOpen && (
          <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-3 text-xs text-slate-700">
            {jobOffer.rawText}
          </pre>
        )}
      </section>

      {/* ============================================ Recommended mode */}
      <section className="rounded-xl border border-brand/30 bg-brand/5 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-dark">
              Recommended mode
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Runs parse → tailor → auto-approve AI defaults → render in one click.
              You can still tweak everything below and regenerate manually.
            </p>
          </div>
          <button
            onClick={runRecommended}
            disabled={recommendedRunning || generating || parsing || tailoring}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {recommendedRunning ? "Running…" : "Tailor & generate (recommended)"}
          </button>
        </div>
        <RecommendedProgress steps={steps} />
      </section>

      {/* ============================================ Parse + Signals */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            1 — Extract signals
          </h2>
          <button
            onClick={runParse}
            disabled={parsing}
            className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {parsing ? "Parsing…" : signals ? "Re-parse" : "Parse with AI"}
          </button>
        </div>
        {signals && <SignalsCard signals={signals} />}
        {!signals && (
          <p className="mt-2 text-xs text-slate-500">
            Parsing extracts structured fields (must-have skills, seniority, tone)
            from the raw job description.
          </p>
        )}
      </section>

      {/* ============================================ Tailor */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            2 — AI tailoring
          </h2>
          <button
            onClick={runTailor}
            disabled={tailoring || !signals}
            className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {tailoring ? "Tailoring…" : tailorResponse ? "Re-tailor" : "Tailor with AI"}
          </button>
        </div>
        {!signals && (
          <p className="mt-2 text-xs text-slate-500">
            Parse the job offer first.
          </p>
        )}
        {signals && !tailorResponse && (
          <p className="mt-2 text-xs text-slate-500">
            Generates a tailored summary, ranked capability bullets, bullet
            rewrites for top experience items, and recommended optional sections.
          </p>
        )}
      </section>

      {tailorResponse && (
        <>
          {/* ============================================ Summary */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              3 — Summary review
            </h2>
            <SummaryReview
              original={defaultSummary}
              suggested={tailorResponse.suggestedSummary}
              onChange={setApprovedSummary}
            />
          </section>

          {/* ============================================ Skills (tailored) */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              4 — Skills (tailored)
            </h2>
            <SkillsRanked
              suggestions={tailorResponse.suggestedCapabilities.map<SkillSuggestion>(
                (s) => ({
                  id: s.id,
                  title: s.title,
                  details: s.details,
                  rationale: s.rationale,
                }),
              )}
              onChange={(rows) =>
                setApprovedCapabilities(
                  rows.map((r) => ({
                    id: r.id,
                    title: r.title,
                    details: r.details,
                  })),
                )
              }
            />
          </section>

          {/* ============================================ Bullet picker */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              5 — Experience bullets
            </h2>
            <BulletPicker
              edits={bulletEditsForReview}
              experiences={master.experience.map((e) => ({
                id: e.id,
                title: e.title,
                org: e.org,
              }))}
              onChange={(rows) =>
                setApprovedBullets(
                  rows.map((r) => ({
                    targetId: r.targetId,
                    experienceId: r.experienceId,
                    text: r.text,
                    included: r.included,
                  })),
                )
              }
            />
          </section>

          {/* ============================================ Per-role keyword tags */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              5b — Role keywords
            </h2>
            <ExperienceTagsEditor
              experiences={master.experience.map((e) => ({
                id: e.id,
                title: e.title,
                org: e.org,
              }))}
              suggestions={tailorResponse.experienceTags.map((t) => ({
                experienceId: t.experienceId,
                tags: t.tags,
                rationale: t.rationale,
              }))}
              onChange={setApprovedExperienceTags}
            />
          </section>

          {/* ============================================ Optional sections */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              6 — Optional sections (manual)
            </h2>
            <p className="mb-3 text-xs text-slate-500">
              AI may recommend, but you choose. Education, projects, languages,
              certifications, and additional experience are checkbox-only — they
              are never rephrased by AI.
            </p>
            <CheckboxSectionPicker
              recommendations={optionalBlocks}
              onChange={setSelectedBlockIds}
            />
          </section>
        </>
      )}

      {/* ============================================ Footer actions */}
      <div className="sticky bottom-4 z-10 rounded-xl border border-slate-200 bg-white p-3 shadow-md">
        <div className="flex flex-wrap items-end justify-end gap-3">
          <div className="flex min-w-[240px] flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Template</span>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value as TemplateId)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="neat-cv">Neat CV</option>
              <option value="brilliant-cv">Brilliant CV</option>
            </select>
          </div>
          {template === "brilliant-cv" && (
            <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm text-slate-700">
              <div
                onClick={() => setShowProfilePhoto((v) => !v)}
                className={`relative h-5 w-9 rounded-full transition-colors ${showProfilePhoto ? "bg-brand" : "bg-slate-300"}`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${showProfilePhoto ? "translate-x-4" : "translate-x-0.5"}`}
                />
              </div>
              Profile picture
            </label>
          )}
          <button
            onClick={saveDraft}
            disabled={saving || !sessionId}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save draft"}
          </button>
          <button
            onClick={generatePdf}
            disabled={generating || !sessionId}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {generating ? "Generating…" : "Generate PDF"}
          </button>
        </div>
        <div className="mt-3 flex justify-end text-xs">
          {info && <span className="text-emerald-600">{info}</span>}
          {error && <span className="text-red-600">Error: {error}</span>}
          {!info && !error && <span className="text-slate-400">Ready</span>}
        </div>
      </div>

      {/* ============================================ PDF preview */}
      {pdf && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            PDF preview
          </h2>
          <PDFPreview
            base64={pdf.base64}
            filename={pdf.filename}
            pageCount={pdf.pageCount}
          />
        </section>
      )}
    </div>
  );
}

// =============================================================================
// SignalsCard — read-only chips/lists of the extracted JobSignals.
// =============================================================================
function SignalsCard({ signals }: { signals: JobSignals }) {
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Chips label="Required skills" items={signals.requiredSkills} />
      <Chips label="Preferred skills" items={signals.preferredSkills} />
      <Chips label="Keywords" items={signals.keywords} />
      <Chips label="Role themes" items={signals.roleThemes} />
      <Chips label="Suggested emphasis" items={signals.suggestedEmphasis} />
    </div>
  );
}

// =============================================================================
// RecommendedProgress — inline progress strip for the recommended-mode
// pipeline. Always rendered; in "idle" state every step shows as a muted chip.
// =============================================================================
function RecommendedProgress({
  steps,
}: {
  steps: Record<
    "parse" | "tailor" | "approve" | "typst" | "compile",
    "idle" | "running" | "done" | "error"
  >;
}) {
  const order: Array<{
    key: "parse" | "tailor" | "approve" | "typst" | "compile";
    label: string;
  }> = [
    { key: "parse", label: "Parse" },
    { key: "tailor", label: "Tailor" },
    { key: "approve", label: "Approve defaults" },
    { key: "typst", label: "Build Typst" },
    { key: "compile", label: "Compile PDF" },
  ];
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
      {order.map((s, i) => {
        const state = steps[s.key];
        const palette =
          state === "done"
            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
            : state === "running"
              ? "bg-amber-100 text-amber-800 border-amber-200 animate-pulse"
              : state === "error"
                ? "bg-red-100 text-red-800 border-red-200"
                : "bg-slate-100 text-slate-500 border-slate-200";
        return (
          <span key={s.key} className="flex items-center gap-1.5">
            <span
              className={`rounded-full border px-2 py-0.5 ${palette}`}
              aria-label={`${s.label}: ${state}`}
            >
              {state === "done" ? "✓ " : state === "error" ? "✗ " : ""}
              {s.label}
            </span>
            {i < order.length - 1 && (
              <span className="text-slate-300" aria-hidden>
                →
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

function Chips({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="flex flex-wrap gap-1">
        {items.length === 0 ? (
          <span className="text-xs text-slate-400">—</span>
        ) : (
          items.map((it, i) => (
            <span
              key={`${it}-${i}`}
              className="rounded-full bg-brand/10 px-2 py-0.5 text-xs text-brand-dark"
            >
              {it}
            </span>
          ))
        )}
      </div>
    </div>
  );
}


