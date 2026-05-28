"use client";

import { useState, useEffect, useCallback } from "react";
import type { MasterResume } from "@resume-tailor/shared-types";

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

type SectionKey =
  | "basics"
  | "experience"
  | "education"
  | "projects"
  | "certifications"
  | "languages"
  | "capabilities"
  | "additional_experience"
  | "headlines"
  | "profiles";

interface TabDef {
  key: SectionKey;
  label: string;
  icon: string;
}

const TABS: TabDef[] = [
  { key: "basics", label: "Basics", icon: "👤" },
  { key: "experience", label: "Experience", icon: "💼" },
  { key: "education", label: "Education", icon: "🎓" },
  { key: "projects", label: "Projects", icon: "📁" },
  { key: "certifications", label: "Certifications", icon: "🏅" },
  { key: "languages", label: "Languages", icon: "🌐" },
  { key: "capabilities", label: "Capabilities", icon: "⚡" },
  { key: "additional_experience", label: "Additional", icon: "➕" },
  { key: "headlines", label: "Headlines", icon: "📝" },
  { key: "profiles", label: "Profile Texts", icon: "📄" },
];

// ---------------------------------------------------------------------------
// Client-side data fetching + tabs
// ---------------------------------------------------------------------------

function ProfilePageContent() {
  const [data, setData] = useState<MasterResume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [activeTab, setActiveTab] = useState<SectionKey>("experience");
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const showToast = useCallback((msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Fetch master resume on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/master-resume");
        if (!res.ok) {
          throw new Error(`Failed to load: ${res.status}`);
        }
        const json = await res.json();
        if (!cancelled) {
          if (json.ok) {
            setData(json.data as MasterResume);
          } else {
            setError(json.error ?? "Unknown error");
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Save handler
  const handleSave = useCallback(async () => {
    if (!data) return;
    setSaving(true);
    setSaveOk(false);
    try {
      const res = await fetch("/api/master-resume", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        showToast(json.error ?? "Save failed", "err");
        return;
      }
      setSaveOk(true);
      showToast("Profile saved successfully", "ok");
    } catch {
      showToast("Network error while saving", "err");
    } finally {
      setSaving(false);
    }
  }, [data, showToast]);

  if (loading) {
    return (
      <div className="mx-auto flex max-w-4xl items-center justify-center py-20">
        <div className="text-slate-400">Loading profile…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl py-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <h1 className="text-xl font-semibold text-red-800">
            Unable to load profile
          </h1>
          <p className="mt-2 text-sm text-red-700">{error || "No data found"}</p>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  const activeSection = activeTab;

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-8">
      {/* Header + Save */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand-dark">Your Profile</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your master resume — every section feeds AI tailoring.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          {saving ? (
            <>
              <Spinner className="mr-2 h-4 w-4" /> Saving…
            </>
          ) : saveOk ? (
            "✓ Saved"
          ) : (
            "💾 Save All"
          )}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`rounded-lg border px-4 py-2 text-sm shadow-sm ${
            toast.type === "ok"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Tab bar */}
      <nav
        className="flex overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm"
        role="tablist"
        aria-label="Profile sections"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.key}`}
              id={`tab-${tab.key}`}
              onClick={() => setActiveTab(tab.key)}
              className={[
                "flex shrink-0 items-center gap-1.5 border-r border-slate-100 px-4 py-2.5 text-sm font-medium transition",
                isActive
                  ? "border-b-2 border-b-brand text-brand"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
              ].join(" ")}
            >
              <span className="text-base">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Active panel */}
      <section
        id={`panel-${activeSection}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeSection}`}
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <SectionContent
          masterResume={data}
          section={activeSection}
          onChange={(patch) => setData((prev) => (prev ? { ...prev, ...patch } : null))}
        />
      </section>
    </div>
  );
}

export { ProfilePageContent };

// ---------------------------------------------------------------------------
// Section content renderer
// ---------------------------------------------------------------------------

import type {
  Basics,
  Experience,
  Education,
  Project,
  Certification,
  Language,
  Capability,
  HeadlineVariant,
  ProfileVariant,
  AdditionalExperienceSchema as AdditionalExperienceSchemaType,
} from "@resume-tailor/shared-types";
import { SectionBasicsEditor } from "@/components/section-basics-editor";
import { SectionExperienceEditor } from "@/components/section-experience-editor";
import { SectionEducationEditor } from "@/components/section-education-editor";
import { SectionProjectsEditor } from "@/components/section-projects-editor";
import { SectionCertificationsEditor } from "@/components/section-certifications-editor";
import { SectionLanguagesEditor } from "@/components/section-languages-editor";
import { SectionCapabilitiesEditor } from "@/components/section-capabilities-editor";
import { SectionAdditionalEditor } from "@/components/section-additional-editor";
import { SectionHeadlinesEditor } from "@/components/section-headlines-editor";
import { SectionProfilesEditor } from "@/components/section-profiles-editor";

interface SectionContentProps {
  masterResume: MasterResume;
  section: SectionKey;
  onChange: (patch: Partial<MasterResume>) => void;
}

function SectionContent({ masterResume, section, onChange }: SectionContentProps) {
  const editors: Record<SectionKey, React.ReactNode> = {
    basics: (
      <SectionBasicsEditor
        basics={masterResume.basics}
        onChange={(basics) => onChange({ basics })}
      />
    ),
    experience: (
      <SectionExperienceEditor
        items={masterResume.experience}
        onChange={(experience) => onChange({ experience })}
      />
    ),
    education: (
      <SectionEducationEditor
        items={masterResume.education}
        onChange={(education) => onChange({ education })}
      />
    ),
    projects: (
      <SectionProjectsEditor
        items={masterResume.projects}
        onChange={(projects) => onChange({ projects })}
      />
    ),
    certifications: (
      <SectionCertificationsEditor
        items={masterResume.certifications}
        onChange={(certifications) => onChange({ certifications })}
      />
    ),
    languages: (
      <SectionLanguagesEditor
        items={masterResume.languages}
        onChange={(languages) => onChange({ languages })}
      />
    ),
    capabilities: (
      <SectionCapabilitiesEditor
        items={masterResume.capability_pool}
        onChange={(capability_pool) => onChange({ capability_pool })}
      />
    ),
    additional_experience: (
      <SectionAdditionalEditor
        items={masterResume.additional_experience}
        onChange={(additional_experience) => onChange({ additional_experience })}
      />
    ),
    headlines: (
      <SectionHeadlinesEditor
        items={masterResume.headline_variants}
        onChange={(headline_variants) => onChange({ headline_variants })}
      />
    ),
    profiles: (
      <SectionProfilesEditor
        items={masterResume.profile_variants}
        onChange={(profile_variants) => onChange({ profile_variants })}
      />
    ),
  };

  const sectionLabels: Record<SectionKey, string> = {
    basics: "Contact & Basics",
    experience: "Work Experience",
    education: "Education",
    projects: "Projects",
    certifications: "Certifications",
    languages: "Languages",
    capabilities: "Capabilities",
    additional_experience: "Additional Experience",
    headlines: "Headlines",
    profiles: "Profile Texts",
  };

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-brand-dark">
        {sectionLabels[section]}
      </h2>
      {editors[section]}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Spinner (inline)
// ---------------------------------------------------------------------------

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
