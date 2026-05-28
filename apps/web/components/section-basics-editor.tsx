"use client";

/**
 * SectionBasicsEditor — renders and edits the basics (contact) fields.
 */
import { useState } from "react";
import type { Basics } from "@resume-tailor/shared-types";

interface Props {
  basics: Basics;
  onChange: (basics: Basics) => void;
}

const FIELDS: Array<{ key: keyof Basics; label: string; type: "text" | "email"; placeholder: string }> = [
  { key: "first_name", label: "First Name", type: "text", placeholder: "Jane" },
  { key: "last_name", label: "Last Name", type: "text", placeholder: "Doe" },
  { key: "email", label: "Email", type: "email", placeholder: "jane@example.com" },
  { key: "phone", label: "Phone", type: "text", placeholder: "+1 555 123 4567" },
  { key: "location", label: "Location", type: "text", placeholder: "City, Country" },
  { key: "website", label: "Website (optional)", type: "text", placeholder: "https://jane.dev" },
  { key: "linkedin", label: "LinkedIn (optional)", type: "text", placeholder: "https://linkedin.com/in/janedoe" },
];

export function SectionBasicsEditor({ basics, onChange }: Props) {
  const update = (key: keyof Basics, value: string) => {
    onChange({ ...basics, [key]: value });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <label key={f.key} className="block text-xs">
            <span className="mb-1 block font-medium text-slate-700">{f.label}</span>
            <input
              type={f.type}
              value={basics[f.key]}
              onChange={(e) => update(f.key, e.target.value)}
              placeholder={f.placeholder}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-inner focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
