"use client";

/**
 * SectionCertificationsEditor — manages certification entries with add/edit/delete.
 */
import { useState } from "react";
import type { Certification } from "@resume-tailor/shared-types";

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID?.() ?? Date.now().toString(36)}`;
}

interface Props {
  items: Certification[];
  onChange: (items: Certification[]) => void;
}

interface DraftEntry extends Omit<Certification, "id"> {
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
  const [issuer, setIssuer] = useState(initial?.issuer ?? "");
  const [year, setYear] = useState(initial?.year?.toString() ?? "");
  const [tags, setTags] = useState(initial?.tags?.join(", ") ?? "");

  const handleSave = () => {
    if (!title.trim()) return;
    const yearOrPresent = (val: string) => (val === "Present" || val === "" ? undefined : val);
    onSave({
      id: initial?.id ?? newId("cert"),
      title: title.trim(),
      issuer: issuer.trim(),
      year: yearOrPresent(year),
      tags: tags.split(",").map<string>((t: string) => t.trim()).filter((t: string) => t.length > 0),
    });
  };

  return (
    <div className="rounded-lg border border-brand/30 bg-brand/5 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs">
          <span className="mb-1 block font-medium text-slate-700">Certification Name *</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="AWS Solutions Architect"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-inner focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </label>
        <label className="block text-xs">
          <span className="mb-1 block font-medium text-slate-700">Issuer</span>
          <input
            value={issuer}
            onChange={(e) => setIssuer(e.target.value)}
            placeholder="Amazon Web Services"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-inner focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </label>
        <label className="block text-xs">
          <span className="mb-1 block font-medium text-slate-700">Year</span>
          <input
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="2023"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-inner focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </label>
      </div>
      <label className="mt-3 block text-xs">
        <span className="mb-1 block font-medium text-slate-700">Tags (comma-separated)</span>
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="Cloud, Architecture"
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
  entry: Certification;
  onEdit: (entry: DraftEntry) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-semibold text-slate-900">{entry.title}</h4>
          {entry.issuer && (
            <p className="text-xs text-slate-600">{entry.issuer}</p>
          )}
          {entry.year && (
            <p className="mt-1 text-[11px] font-medium text-slate-500">{entry.year}</p>
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
                issuer: entry.issuer ?? "",
                year: entry.year,
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

export function SectionCertificationsEditor({ items, onChange }: Props) {
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
    if (confirm("Delete this certification?")) {
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
          + Add Certification
        </button>
      )}
      {items.length === 0 && !adding && !editing && (
        <p className="py-8 text-center text-sm text-slate-400">
          No certifications yet. Click &quot;+ Add Certification&quot; to get started.
        </p>
      )}
      {items.map((entry) => (
        <EntryCard key={entry.id} entry={entry} onEdit={(e) => setEditing(e)} onDelete={handleDelete} />
      ))}
    </div>
  );
}
