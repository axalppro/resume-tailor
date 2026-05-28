"use client";

/**
 * SectionLanguagesEditor — manages language entries with add/edit/delete.
 */
import { useState } from "react";
import type { Language } from "@resume-tailor/shared-types";

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID?.() ?? Date.now().toString(36)}`;
}

interface Props {
  items: Language[];
  onChange: (items: Language[]) => void;
}

interface DraftEntry extends Omit<Language, "id"> {
  id: string;
}

const LEVELS = ["Native", "Fluent", "Advanced", "Intermediate", "Basic"];

function EntryForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: DraftEntry;
  onSave: (entry: DraftEntry) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [level, setLevel] = useState(initial?.level ?? LEVELS[2]);
  const [tags, setTags] = useState(initial?.tags?.join(", ") ?? "");

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: initial?.id ?? newId("lang"),
      name: name.trim(),
      level,
      tags: tags.split(",").map<string>((t: string) => t.trim()).filter((t: string) => t.length > 0),
    });
  };

  return (
    <div className="rounded-lg border border-brand/30 bg-brand/5 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs">
          <span className="mb-1 block font-medium text-slate-700">Language *</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="English"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-inner focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </label>
        <label className="block text-xs">
          <span className="mb-1 block font-medium text-slate-700">Proficiency Level</span>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-inner focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          >
            {LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="mt-3 block text-xs">
        <span className="mb-1 block font-medium text-slate-700">Tags (comma-separated)</span>
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="Spoken, Written"
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
          disabled={!name.trim()}
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
  entry: Language;
  onEdit: (entry: DraftEntry) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-slate-900">{entry.name}</h4>
          <p className="text-xs text-slate-600">{entry.level}</p>
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
                name: entry.name,
                level: entry.level,
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

export function SectionLanguagesEditor({ items, onChange }: Props) {
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
    if (confirm("Delete this language?")) {
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
          + Add Language
        </button>
      )}
      {items.length === 0 && !adding && !editing && (
        <p className="py-8 text-center text-sm text-slate-400">
          No languages yet. Click &quot;+ Add Language&quot; to get started.
        </p>
      )}
      {items.map((entry) => (
        <EntryCard key={entry.id} entry={entry} onEdit={(e) => setEditing(e)} onDelete={handleDelete} />
      ))}
    </div>
  );
}
