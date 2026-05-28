"use client";

/**
 * SectionExperienceEditor — manages experience entries with add/edit/delete.
 */
import { useState } from "react";
import type { Experience, ExperienceBullet } from "@resume-tailor/shared-types";

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID?.() ?? Date.now().toString(36)}`;
}

interface Props {
  items: Experience[];
  onChange: (items: Experience[]) => void;
}

interface DraftEntry extends Omit<Experience, "id"> {
  id: string;
}

function BulletInput({ onAdd }: { onAdd: (text: string) => void }) {
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    if (value.trim()) {
      onAdd(value);
      setValue("");
    }
  };

  return (
    <div className="flex gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleSubmit();
          }
        }}
        placeholder="+ Add bullet point"
        className="flex-1 rounded-md border border-dashed border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-600 shadow-inner placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!value.trim()}
        className="rounded px-2 py-1.5 text-xs font-medium text-slate-400 hover:text-brand disabled:opacity-30"
        title="Add bullet"
      >
        +
      </button>
    </div>
  );
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
  const [org, setOrg] = useState(initial?.org ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [startYear, setStartYear] = useState(initial?.start_year?.toString() ?? "");
  const [endYear, setEndYear] = useState(initial?.end_year?.toString() ?? "");
  const [tags, setTags] = useState(initial?.tags?.join(", ") ?? "");
  const [bullets, setBullets] = useState<ExperienceBullet[]>(
    initial?.bullets
      ? initial.bullets.map((b) => (typeof b === "string" ? { id: newId("bullet"), text: b } : b))
      : []
  );

  const handleAddBullet = (text: string) => {
    if (text.trim()) {
      setBullets([...bullets, { id: newId("bullet"), text: text.trim() }]);
    }
  };

  const handleDeleteBullet = (id: string) => {
    setBullets(bullets.filter((b) => b.id !== id));
  };

  const handleSave = () => {
    if (!title.trim() || !org.trim()) return;
    const yearOrPresent = (val: string) => (val === "Present" || val === "" ? undefined : val);
    onSave({
      id: initial?.id ?? newId("exp"),
      title: title.trim(),
      org: org.trim(),
      location: location.trim(),
      start_year: startYear,
      end_year: yearOrPresent(endYear),
      keywords: initial?.keywords ?? [],
      tags: tags.split(",").map<string>((t: string) => t.trim()).filter((t: string) => t.length > 0),
      bullets,
    });
  };

  return (
    <div className="rounded-lg border border-brand/30 bg-brand/5 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs">
          <span className="mb-1 block font-medium text-slate-700">Position *</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Senior Software Engineer"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-inner focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </label>
        <label className="block text-xs">
          <span className="mb-1 block font-medium text-slate-700">Company *</span>
          <input
            value={org}
            onChange={(e) => setOrg(e.target.value)}
            placeholder="Acme Corp"
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
              placeholder="2020"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-inner focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>
          <label className="block text-xs">
            <span className="mb-1 block font-medium text-slate-700">End</span>
            <input
              value={endYear}
              onChange={(e) => setEndYear(e.target.value)}
              placeholder="Present"
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
          placeholder="React, TypeScript, Node.js"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-inner focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </label>

      {/* Bullet points */}
      <div className="mt-4 space-y-2">
        <span className="mb-2 block text-xs font-medium text-slate-700">Bullet Points</span>
        {bullets.map((bullet) => (
          <div key={bullet.id} className="flex gap-2">
            <input
              value={bullet.text}
              onChange={(e) => {
                setBullets(
                  bullets.map((b) =>
                    b.id === bullet.id ? { ...b, text: e.target.value } : b
                  )
                );
              }}
              placeholder="Achievement or responsibility"
              className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-inner focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
            <button
              type="button"
              onClick={() => handleDeleteBullet(bullet.id)}
              className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
              title="Delete bullet"
            >
              ✕
            </button>
          </div>
        ))}
        {/* Empty bullet input for adding new ones */}
        <BulletInput onAdd={handleAddBullet} />
      </div>

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
          disabled={!title.trim() || !org.trim()}
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
  entry: Experience;
  onEdit: (entry: DraftEntry) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-semibold text-slate-900">{entry.title}</h4>
          <p className="text-xs text-slate-600">{entry.org}</p>
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
              {entry.tags.map((tag) => (
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
                org: entry.org,
                location: entry.location ?? "",
                start_year: entry.start_year,
                end_year: entry.end_year,
                keywords: entry.keywords,
                tags: entry.tags,
                bullets: entry.bullets,
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
      {entry.bullets && entry.bullets.length > 0 && (
        <ul className="mt-3 space-y-1">
      {entry.bullets
        .map((b, i) => (typeof b === "string" ? { id: `b-${i}`, text: b } : b))
        .map((b: ExperienceBullet, i: number) => (
          <li key={b.id || `b-${i}`} className="flex items-start gap-2 text-xs text-slate-600">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-300" />
            <span className="flex-1">{b.text}</span>
          </li>
        ))}
        </ul>
      )}
    </div>
  );
}

export function SectionExperienceEditor({ items, onChange }: Props) {
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
    if (confirm("Delete this experience entry?")) {
      onChange(items.filter((e) => e.id !== id));
    }
  };

  return (
    <div className="space-y-4">
      {editing && (
        <EntryForm
          initial={editing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      {!editing && adding && (
        <EntryForm
          onSave={handleSave}
          onCancel={() => setAdding(false)}
        />
      )}

      {!editing && !adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="rounded-md border border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-slate-500 hover:border-brand hover:text-brand"
        >
          + Add Experience
        </button>
      )}

      {items.length === 0 && !adding && !editing && (
        <p className="py-8 text-center text-sm text-slate-400">
          No experience entries yet. Click &quot;+ Add Experience&quot; to get started.
        </p>
      )}

      {items.map((entry) => (
        <EntryCard
          key={entry.id}
          entry={entry}
          onEdit={(e) => setEditing(e)}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
