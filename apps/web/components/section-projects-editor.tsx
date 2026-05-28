"use client";

/**
 * SectionProjectsEditor — manages project entries with add/edit/delete.
 */
import { useState } from "react";
import type { Project } from "@resume-tailor/shared-types";

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID?.() ?? Date.now().toString(36)}`;
}

interface Props {
  items: Project[];
  onChange: (items: Project[]) => void;
}

interface DraftEntry extends Omit<Project, "id"> {
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
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [startYear, setStartYear] = useState(initial?.start_year?.toString() ?? "");
  const [endYear, setEndYear] = useState(initial?.end_year?.toString() ?? "");
  const [tags, setTags] = useState(initial?.tags?.join(", ") ?? "");

  const handleSave = () => {
    if (!title.trim()) return;
    const yearOrPresent = (val: string) => (val === "Present" || val === "" ? undefined : val);
    onSave({
      id: initial?.id ?? newId("proj"),
      title: title.trim(),
      subtitle: subtitle.trim(),
      location: location.trim(),
      start_year: startYear,
      end_year: yearOrPresent(endYear),
      keywords: initial?.keywords ?? [],
      tags: tags.split(",").map<string>((t: string) => t.trim()).filter((t: string) => t.length > 0),
    });
  };

  return (
    <div className="rounded-lg border border-brand/30 bg-brand/5 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs">
          <span className="mb-1 block font-medium text-slate-700">Project Name *</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="E-Commerce Platform"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-inner focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </label>
        <label className="block text-xs">
          <span className="mb-1 block font-medium text-slate-700">Subtitle (optional)</span>
          <input
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Full-stack web application"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-inner focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </label>
        <label className="block text-xs">
          <span className="mb-1 block font-medium text-slate-700">Location</span>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Remote"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-inner focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs">
            <span className="mb-1 block font-medium text-slate-700">Start</span>
            <input
              value={startYear}
              onChange={(e) => setStartYear(e.target.value)}
              placeholder="2022"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-inner focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>
          <label className="block text-xs">
            <span className="mb-1 block font-medium text-slate-700">End</span>
            <input
              value={endYear}
              onChange={(e) => setEndYear(e.target.value)}
              placeholder="2023"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-inner focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>
        </div>
      </div>
      <label className="mt-3 block text-xs">
        <span className="mb-1 block font-medium text-slate-700">Tags (comma-separated)</span>
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="Next.js, PostgreSQL, AWS"
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
          disabled={!title.trim()}
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
  entry: Project;
  onEdit: (entry: DraftEntry) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-semibold text-slate-900">{entry.title}</h4>
          {entry.subtitle && (
            <p className="text-xs text-slate-600">{entry.subtitle}</p>
          )}
          {entry.location && (
            <p className="mt-0.5 text-xs text-slate-400">{entry.location}</p>
          )}
          {(entry.start_year || entry.end_year) && (
            <p className="mt-1 text-[11px] font-medium text-slate-500">
              {entry.start_year} — {entry.end_year ?? "Present"}
            </p>
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
                subtitle: entry.subtitle ?? "",
                location: entry.location ?? "",
                start_year: entry.start_year,
                end_year: entry.end_year,
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

export function SectionProjectsEditor({ items, onChange }: Props) {
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
    if (confirm("Delete this project?")) {
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
          + Add Project
        </button>
      )}
      {items.length === 0 && !adding && !editing && (
        <p className="py-8 text-center text-sm text-slate-400">
          No projects yet. Click &quot;+ Add Project&quot; to get started.
        </p>
      )}
      {items.map((entry) => (
        <EntryCard key={entry.id} entry={entry} onEdit={(e) => setEditing(e)} onDelete={handleDelete} />
      ))}
    </div>
  );
}
