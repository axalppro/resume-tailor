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
  ApprovedTailoring,
  BlockRecommendation,
  ContentBlockType,
  JobSignals,
  MasterResume,
  SuggestedEdit,
  TailorResponse,
} from "@resume-tailor/shared-types";
import { CapabilitiesRanked } from "./capabilities-ranked";
import { SummaryReview } from "./summary-review";
import { BulletRewritesReview } from "./bullet-rewrites-review";
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
    { id: string; text: string }[]
  >([]);
  const [approvedBullets, setApprovedBullets] = useState<
    { targetId: string; text: string }[]
  >([]);
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);

  // PDF preview
  const [pdf, setPdf] = useState<{ base64: string; filename: string; pageCount?: number } | null>(
    null,
  );

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
  useEffect(() => {
    const a = initialSession?.approved as Partial<ApprovedTailoring> | null;
    if (!a) return;
    if (a.approvedSummary) setApprovedSummary(a.approvedSummary);
    if (a.approvedCapabilities) setApprovedCapabilities(a.approvedCapabilities);
    if (a.approvedBulletRewrites) setApprovedBullets(a.approvedBulletRewrites);
    if (a.selected) {
      // Pre-check selected block IDs derived from refIds (best-effort).
      // Block IDs are stored on TailorResponse.recommendedBlocks; we can't map
      // perfectly without it, but if it is present we'll let CheckboxSectionPicker
      // re-seed from its own props anyway.
    }
  }, [initialSession]);

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
    // Map selected block IDs back to refIds, grouped by block type.
    const blockById = new Map(
      (tailorResponse?.recommendedBlocks ?? []).map((b) => [b.blockId, b]),
    );

    // We don't have refId on BlockRecommendation; we need to look it up in
    // the master via title fallback. Easier: ContentBlock.refId arrived
    // alongside the block list — but BlockRecommendation strips it. We pre-
    // built `recommendedBlocks` from blocks where refId was set; so re-derive
    // by best-effort name matching against master.
    const refIdFor = (block: BlockRecommendation): string => {
      // Many block IDs ARE the refId already in the seed; if not, fall back
      // to using the block.title to look up the matching item in master.
      switch (block.blockType) {
        case "education":
          return master.education.find((e) => e.title === block.title)?.id ?? block.blockId;
        case "project":
          return master.projects.find((p) => p.title === block.title)?.id ?? block.blockId;
        case "language":
          return master.languages.find((l) => l.name === block.title)?.id ?? block.blockId;
        case "certification":
          return master.certifications.find((c) => c.title === block.title)?.id ?? block.blockId;
        case "additional_experience":
          return (
            master.additional_experience.find((a) => a.title === block.title)?.id ?? block.blockId
          );
        case "experience_entry":
          return master.experience.find((e) => e.title === block.title)?.id ?? block.blockId;
        default:
          return block.blockId;
      }
    };

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
      const refId = refIdFor(blk);
      switch (blk.blockType) {
        case "education":
          selected.education.push(refId);
          break;
        case "project":
          selected.projects.push(refId);
          break;
        case "language":
          selected.languages.push(refId);
          break;
        case "certification":
          selected.certifications.push(refId);
          break;
        case "additional_experience":
          selected.additional_experience.push(refId);
          break;
      }
    }

    return {
      selected,
      approvedSummary: approvedSummary || defaultSummary,
      approvedCapabilities,
      approvedBulletRewrites: approvedBullets,
    };
  }, [
    tailorResponse,
    selectedBlockIds,
    approvedCapabilities,
    approvedSummary,
    approvedBullets,
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
        body: JSON.stringify({ masterResumeId, approved }),
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

          {/* ============================================ Capabilities */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              4 — Capabilities (ranked)
            </h2>
            <CapabilitiesRanked
              suggestions={tailorResponse.suggestedCapabilities}
              onChange={setApprovedCapabilities}
            />
          </section>

          {/* ============================================ Bullet rewrites */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              5 — Bullet rewrites
            </h2>
            <BulletRewritesReview
              edits={bulletEditsForReview}
              onChange={setApprovedBullets}
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
      <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-md">
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
        <div className="ml-auto flex flex-col gap-1 text-xs">
          {info && <span className="text-emerald-600">{info}</span>}
          {error && <span className="text-red-600">Error: {error}</span>}
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


