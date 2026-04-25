"use client";

import { useEffect, useState } from "react";
import { MultiSelectDropdown } from "@/components/multi-select-dropdown";
import { createLab } from "./actions";

const departmentOptions: Record<string, string[]> = {
  "Harvard University": ["Biology", "Chemistry", "Computer Science", "Neuroscience", "Public Health"],
  "Stanford University": [
    "Bioengineering",
    "Biomedical Data Science",
    "Computer Science",
    "Neurology",
    "Psychiatry",
  ],
  "MIT": ["Biological Engineering", "Brain and Cognitive Sciences", "EECS", "Mechanical Engineering"],
  default: ["Biology", "Chemistry", "Computer Science", "Neuroscience", "Psychology"],
};

const environmentOptions = [
  { value: "hands_on_training", label: "Hands-on training" },
  { value: "mentorship_heavy", label: "Mentorship-heavy" },
  { value: "independent_work", label: "Independent work" },
  { value: "clinical_patient_facing", label: "Clinical/patient-facing" },
  { value: "fast_paced", label: "Fast-paced" },
  { value: "computation_heavy", label: "Computation-heavy" },
  { value: "collaborative", label: "Collaborative" },
];

type LabCreateFormProps = {
  defaultUniversity: string;
  error?: string;
  errorDetail?: string;
};

const errorCopy: Record<string, string> = {
  missing_required: "Please complete all required fields before creating your lab.",
  invalid_slug: "The slug is invalid. Use letters, numbers, spaces, or hyphens.",
  create_failed: "Lab creation failed on the server.",
  membership_failed: "Lab was created, but adding your PI membership failed.",
};

export function LabCreateForm({ defaultUniversity, error, errorDetail }: LabCreateFormProps) {
  const [page, setPage] = useState(1);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [university, setUniversity] = useState(defaultUniversity);
  const [department, setDepartment] = useState("");
  const [researchFields, setResearchFields] = useState<string[]>([]);
  const [researchTags, setResearchTags] = useState<string[]>([]);
  const [pendingResearchTag, setPendingResearchTag] = useState("");
  const [labEnvironment, setLabEnvironment] = useState<string[]>([]);

  useEffect(() => {
    if (!slug.trim()) {
      setSlug(toSlug(name));
    }
  }, [name, slug]);

  const departments = departmentOptions[university] ?? departmentOptions.default;
  const canContinue = Boolean(name.trim() && (slug.trim() || name.trim()) && university.trim());
  const canSubmit = canContinue && researchFields.length > 0;

  function addResearchTag(raw: string) {
    const tag = raw.trim();
    if (!tag) return;
    if (researchTags.some((existing) => existing.toLowerCase() === tag.toLowerCase())) return;
    setResearchTags((current) => [...current, tag]);
    setPendingResearchTag("");
  }

  function removeResearchTag(tagToRemove: string) {
    setResearchTags((current) => current.filter((tag) => tag !== tagToRemove));
  }

  return (
    <form
      action={createLab}
      className="mt-8 overflow-hidden rounded-3xl border border-ll-navy/10 bg-white/95 p-6 shadow-xl shadow-ll-navy/10 backdrop-blur-sm md:p-8"
    >
      <div className="mb-6 h-1 w-full rounded-full bg-gradient-to-r from-ll-navy via-ll-purple to-teal-400" aria-hidden />
      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-orange-50/50 px-4 py-3 text-sm text-red-800">
          <p className="font-semibold">{errorCopy[error] ?? "Something went wrong while creating the lab."}</p>
          {errorDetail ? <p className="mt-1 text-xs opacity-90">{errorDetail}</p> : null}
        </div>
      ) : null}
      <div className="mb-4 h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 ring-1 ring-zinc-200/60">
        <div
          className="h-full rounded-full bg-gradient-to-r from-ll-navy via-ll-purple to-teal-500 transition-all duration-300"
          style={{ width: page === 1 ? "50%" : "100%" }}
        />
      </div>
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-ll-purple">
        Step {page} of 2 — {page === 1 ? "Lab identity" : "Research and settings"}
      </p>

      <div className={`mt-5 grid gap-4 ${page === 1 ? "block" : "hidden"}`}>
          <Field
            label="Lab name"
            name="name"
            value={name}
            onChange={setName}
            required
            hint="Your public lab or research group name."
          />
          <Field
            label="URL slug"
            name="slug"
            value={slug}
            onChange={setSlug}
            required
            hint="Auto-generated from lab name if left blank."
          />
          <Field label="University" name="university" value={university} onChange={setUniversity} required />

          <div className="space-y-2">
            <label htmlFor="department" className="text-sm font-medium text-ll-navy">
              Department
            </label>
            <select
              id="department"
              name="department"
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="">Select a department</option>
              {departments.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <Field label="Tagline" name="tagline" hint="One sentence shown in cards." />

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium text-ll-navy">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={5}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              placeholder="Describe your research focus and what your lab is working on."
            />
          </div>

          <Field label="Lab website URL" name="website_url" placeholder="https://..." />

          <div className="grid gap-4 md:grid-cols-2">
            <FileField label="Logo upload" name="logo" />
            <FileField label="Banner image upload" name="banner" />
          </div>
        </div>
      <div className={`mt-5 grid gap-4 ${page === 2 ? "block" : "hidden"}`}>
          <MultiSelectDropdown
            label="Research fields"
            values={researchFields}
            options={[
              { value: "Neuroscience", label: "Neuroscience" },
              { value: "Cancer Biology", label: "Cancer Biology" },
              { value: "Immunology", label: "Immunology" },
              { value: "Genomics", label: "Genomics" },
              { value: "Bioinformatics", label: "Bioinformatics" },
              { value: "Public Health", label: "Public Health" },
              { value: "Biomedical Engineering", label: "Biomedical Engineering" },
            ]}
            onChange={setResearchFields}
            placeholder="Select research fields"
          />
          <input type="hidden" name="research_fields" value={researchFields.join(", ")} />

          <div className="space-y-2">
            <label htmlFor="research_tags" className="text-sm font-medium text-ll-navy">
              Research tags / techniques
            </label>
            <input
              id="research_tags"
              value={pendingResearchTag}
              onChange={(event) => setPendingResearchTag(event.target.value)}
              onBlur={() => addResearchTag(pendingResearchTag)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === ",") {
                  event.preventDefault();
                  addResearchTag(pendingResearchTag);
                }
              }}
              placeholder="Type a tag and press Enter"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            {researchTags.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {researchTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-900"
                  >
                    {tag}
                    <button
                      type="button"
                      aria-label={`Remove ${tag}`}
                      onClick={() => removeResearchTag(tag)}
                      className="text-zinc-500 hover:text-zinc-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            <input type="hidden" name="research_tags" value={researchTags.join(", ")} />
            <p className="text-xs text-zinc-500">
              Type a tag and press Enter or comma to add. Click x to remove.
            </p>
          </div>

          <MultiSelectDropdown
            label="Lab environment"
            values={labEnvironment}
            options={environmentOptions}
            onChange={setLabEnvironment}
            placeholder="Choose your environment style"
          />
          <input id="lab_environment" type="hidden" name="lab_environment" value={labEnvironment.join(", ")} />

          <label className="inline-flex items-center gap-2 text-sm text-ll-navy">
            <input type="checkbox" name="requires_posting_approval" className="h-4 w-4 rounded border-zinc-300" />
            Require posting approval
          </label>
        </div>

      <div className="mt-8 flex items-center justify-between border-t border-zinc-100 pt-6">
        <button
          type="button"
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          disabled={page === 1}
          className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition hover:border-ll-purple/30 hover:bg-ll-bg/50 disabled:opacity-40"
        >
          Back
        </button>

        {page === 1 ? (
          <button
            type="button"
            onClick={() => setPage(2)}
            disabled={!canContinue}
            className="rounded-full bg-gradient-to-r from-ll-navy to-[#0a5c6a] px-5 py-2 text-sm font-semibold text-white shadow-md shadow-ll-navy/20 transition hover:brightness-105 disabled:opacity-50"
          >
            Continue
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-full bg-gradient-to-r from-ll-purple to-violet-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-ll-purple/25 transition hover:brightness-105 disabled:opacity-50"
          >
            Create lab
          </button>
        )}
      </div>
    </form>
  );
}

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function Field({
  label,
  name,
  value,
  onChange,
  required,
  hint,
  placeholder,
}: {
  label: string;
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  hint?: string;
  placeholder?: string;
}) {
  const displayValue = value ?? "";
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="flex items-center gap-2 text-sm font-medium text-ll-navy">
        {label}
        {required ? <span className="text-xs font-semibold text-red-600">(required)</span> : null}
      </label>
      <input
        id={name}
        name={name}
        value={onChange ? displayValue : undefined}
        defaultValue={onChange ? undefined : displayValue}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
      />
      {hint ? <p className="text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

function FileField({ label, name }: { label: string; name: string }) {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="text-sm font-medium text-ll-navy">
        {label}
      </label>
      <input id={name} name={name} type="file" accept="image/*" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
    </div>
  );
}
