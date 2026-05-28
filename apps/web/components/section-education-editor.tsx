"use client";

/**
 * SectionEducationEditor — manages education entries with add/edit/delete.
 */
import { useState } from "react";
import type { Education } from "@resume-tailor/shared-types";

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID?.() ?? Date.now().toString(36)}`;
}

interface Props {
  items: Education[];
  onChange: (items: Education[]) => void;
}

interface DraftEntry extends Omit<Education, "id"> {
  id: string;
}

function EntryForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: DraftEntry;
  onSave: (entry: DraftEntry) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [institution, setInstitution] = useState(initial?.institution ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [startYear, setStartYear] = useState(initial?.start_year?.toString() ?? "");
  const [endYear, setEndYear] = useState(initial?.end_year?.toString() ?? "");
  const [thesis, setThesis] = useState(initial?.thesis ?? "");
  const [courses, setCourses] = useState(initial?.courses?.join(", ") ?? "");
  const [tags, setTags] = useState(initial?.tags?.join(", ") ?? "");

  const handleSave = () => {
    if (!title.trim() || !institution.trim()) return;
    const yearOrPresent = (val: string) => (val === "Present" || val === "" ? undefined : val);
    onSave({
      id: initial?.id ?? newId("edu"),
      title: title.trim(),
      institution: institution.trim(),
      location: location.trim(),
      start_year: startYear,
      end_year: yearOrPresent(endYear),
      thesis: thesis.trim(),
      courses: courses.split(",").map<string>((c: string) => c.trim()).filter((c: string) => c.length > 0),
      keywords: initial?.keywords ?? [],
      tags: tags.split(",").map<string>((t: string) => t.trim()).filter((t: string) => t.length > 0),
    });
  };

  return (
    <div className="rounded-lg border border-brand/30 bg-brand/5 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs">
          <span className="mb-1 block font-medium text-slate-700">Degree *</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="B.Sc. Computer Science"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-inner focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </label>
        <label className="block text-xs">
          <span className="mb-1 block font-medium text-slate-700">Institution *</span>
          <input
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            placeholder="MIT"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-inner focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </label>
        <label className="block text-xs">
          <span className="mb-1 block font-medium text-slate-700">Location</span>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Cambridge, MA"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-inner focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs">
            <span className="mb-1 block font-medium text-slate-700">Start</span>
            <input
              value={startYear}
              onChange={(e) => setStartYear(e.target.value)}
              placeholder="2016"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-inner focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>
          <label className="block text-xs">
            <span className="mb-1 block font-medium text-slate-700">End</span>
            <input
              value={endYear}
              onChange={(e) => setEndYear(e.target.value)}
              placeholder="2020"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-inner focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>
        </div>
      </div>
      <label className="mt-3 block text-xs">
        <span className="mb-1 block font-medium text-slate-700">Thesis (optional)</span>
        <input
          value={thesis}
          onChange={(e) => setThesis(e.target.value)}
          placeholder="Live track limits crossing detection system for vehicle race using computer vision"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-inner focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </label>
      <label className="mt-3 block text-xs">
        <span className="mb-1 block font-medium text-slate-700">Courses (comma-separated, optional)</span>
        <input
          value={courses}
          onChange={(e) => setCourses(e.target.value)}
          placeholder="Embedded Systems, Software Design, Mechanics"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-inner focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </label>
      <label className="mt-3 block text-xs">
        <span className="mb-1 block font-medium text-slate-700">Tags (comma-separated)</span>
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="AI, Machine Learning"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-inner focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </label>
      <div className="mt-3 flex items-center gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!title.trim() || !institution.trim()}
          className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {initial ? "Update" : "Add Entry"}
        </button>
      </div>
    </div>
  );
}

function EntryCard({
  entry,
  onEdit,
  onDelete,
}: {
  entry: Education;
  onEdit: (entry: DraftEntry) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-semibold text-slate-900">{entry.title}</h4>
          <p className="text-xs text-slate-600">{entry.institution}</p>
          {entry.location && (
            <p className="mt-0.5 text-xs text-slate-400">{entry.location}</p>
          )}
          {(entry.start_year || entry.end_year) && (
            <p className="mt-1 text-[11px] font-medium text-slate-500">
              {entry.start_year} — {entry.end_year ?? "Present"}
            </p>
          )}
          {entry.thesis && (
            <p className="mt-2 text-xs text-slate-700"><strong>Thesis:</strong> {entry.thesis}</p>
          )}
          {entry.courses && entry.courses.length > 0 && (
            <p className="mt-1 text-xs text-slate-600"><strong>Courses:</strong> {entry.courses.join(", ")}</p>
          )}
          {entry.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {entry.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() =>
              onEdit({
                id: entry.id,
                title: entry.title,
                institution: entry.institution,
                location: entry.location ?? "",
                start_year: entry.start_year,
                end_year: entry.end_year,
                thesis: entry.thesis,
                courses: entry.courses,
                keywords: entry.keywords,
                tags: entry.tags,
              })
            }
            className="rounded p-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-brand"
            title="Edit"
          >
            ✎
          </button>
          <button
            type="button"
            onClick={() => onDelete(entry.id)}
            className="rounded p-1 text-xs text-slate-400 hover:bg-red-50 hover:text-red-600"
            title="Delete"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

export function SectionEducationEditor({ items, onChange }: Props) {
  const [editing, setEditing] = useState<DraftEntry | null>(null);
  const [adding, setAdding] = useState(false);

  const handleSave = (entry: DraftEntry) => {
    if (editing) {
      onChange(items.map((e) => (e.id === entry.id ? entry : e)));
    } else {
      onChange([...items, entry]);
    }
    setEditing(null);
    setAdding(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this education entry?")) {
      onChange(items.filter((e) => e.id !== id));
    }
  };

  return (
    <div className="space-y-4">
      {editing && <EntryForm initial={editing} onSave={handleSave} onCancel={() => setEditing(null)} />}
      {!editing && adding && <EntryForm onSave={handleSave} onCancel={() => setAdding(false)} />}
      {!editing && !adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="rounded-md border border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-slate-500 hover:border-brand hover:text-brand"
        >
          + Add Education
        </button>
      )}
      {items.length === 0 && !adding && !editing && (
        <p className="py-8 text-center text-sm text-slate-400">
          No education entries yet. Click &quot;+ Add Education&quot; to get started.
        </p>
      )}
      {items.map((entry) => (
        <EntryCard key={entry.id} entry={entry} onEdit={(e) => setEditing(e)} onDelete={handleDelete} />
      ))}
    </div>
  );
}
