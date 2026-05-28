"use client";

/**
 * SectionHeadlinesEditor — manages headline variants with add/edit/delete.
 */
import { useState } from "react";
import type { HeadlineVariant } from "@resume-tailor/shared-types";

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID?.() ?? Date.now().toString(36)}`;
}

interface Props {
  items: HeadlineVariant[];
  onChange: (items: HeadlineVariant[]) => void;
}

interface DraftEntry extends Omit<HeadlineVariant, "id"> {
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
  const [text, setText] = useState(initial?.text ?? "");

  const handleSave = () => {
    if (!text.trim()) return;
    onSave({
      id: initial?.id ?? newId("hd"),
      text: text.trim(),
    });
  };

  return (
    <div className="rounded-lg border border-brand/30 bg-brand/5 p-4">
      <label className="block text-xs">
        <span className="mb-1 block font-medium text-slate-700">Headline *</span>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Senior Software Engineer | Full-Stack | Cloud Native"
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
          disabled={!text.trim()}
          className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {initial ? "Update" : "Add Headline"}
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
  entry: HeadlineVariant;
  onEdit: (entry: DraftEntry) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-slate-800">{entry.text}</p>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() =>
              onEdit({
                id: entry.id,
                text: entry.text,
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

export function SectionHeadlinesEditor({ items, onChange }: Props) {
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
    if (confirm("Delete this headline?")) {
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
          + Add Headline
        </button>
      )}
      {items.length === 0 && !adding && !editing && (
        <p className="py-8 text-center text-sm text-slate-400">
          No headline variants yet. Click &quot;+ Add Headline&quot; to get started.
        </p>
      )}
      {items.map((entry) => (
        <EntryCard key={entry.id} entry={entry} onEdit={(e) => setEditing(e)} onDelete={handleDelete} />
      ))}
    </div>
  );
}
