"use client";

import { type Dispatch, type SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Upload } from "lucide-react";
import { completeProfessorOnboarding } from "./actions";
import { parseResumeWithLlm } from "../autofill-actions";
import { MultiSelectDropdown } from "@/components/multi-select-dropdown";

type ProfessorDraft = {
  full_name: string;
  title: string;
  university: string;
  department: string;
  office_location: string;
  lab_website: string;
  google_scholar_url: string;
  orcid: string;
  research_fields: string;
  research_keywords: string;
  research_summary: string;
  preferred_experience_level: string;
  preferred_student_year: string;
  preferred_majors: string;
  mentorship_style: string;
  lab_culture: string;
  profile_visibility: string;
  notify_new_applications: string;
  notify_weekly_digest: string;
  cv_file_name: string;
  cv_url: string;
};

const initialDraft: ProfessorDraft = {
  full_name: "",
  title: "",
  university: "",
  department: "",
  office_location: "",
  lab_website: "",
  google_scholar_url: "",
  orcid: "",
  research_fields: "",
  research_keywords: "",
  research_summary: "",
  preferred_experience_level: "",
  preferred_student_year: "",
  preferred_majors: "",
  mentorship_style: "",
  lab_culture: "",
  profile_visibility: "public",
  notify_new_applications: "true",
  notify_weekly_digest: "true",
  cv_file_name: "",
  cv_url: "",
};

const storageKey = "lablink_professor_onboarding_draft";
const steps = ["Upload CV", "Profile", "Research", "Mentorship", "Preferences"];

const stepHeaders = [
  {
    title: "CV Upload",
    description:
      "Upload your CV to pre-fill your lab profile and research details. You can still edit any field before publishing.",
  },
  {
    title: "Academic and Lab Profile",
    description:
      "Share who you are and where you work so students and collaborators can find and recognize your lab on LabLink.",
  },
  {
    title: "Research Focus",
    description:
      "Define your areas of expertise and keywords so we can match you with students aligned with your science.",
  },
  {
    title: "Mentorship and Culture",
    description:
      "Set expectations for how you guide trainees and what your team environment is like for prospective members.",
  },
  {
    title: "Hiring and Notifications",
    description:
      "Choose who you are looking for and how you want to hear about applications and activity on the platform.",
  },
];

export function ProfessorOnboardingWizard() {
  const [step, setStep] = useState(1);
  const maxStep = steps.length;
  const cvInputRef = useRef<HTMLInputElement>(null);
  const activeHeader = stepHeaders[step - 1];
  const [draft, setDraft] = useState<ProfessorDraft>(() => {
    if (typeof window === "undefined") return initialDraft;
    const saved = window.sessionStorage.getItem(storageKey);
    if (!saved) return initialDraft;
    try {
      return { ...initialDraft, ...JSON.parse(saved) };
    } catch {
      return initialDraft;
    }
  });
  const [uploadStatus, setUploadStatus] = useState<string>("");

  useEffect(() => {
    window.sessionStorage.setItem(storageKey, JSON.stringify(draft));
  }, [draft]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const canContinue = useMemo(() => {
    if (step === 1) return true;
    if (step === 2) return Boolean(draft.full_name && draft.university);
    if (step === 3) return Boolean(draft.research_fields);
    if (step === 4) return true;
    return Boolean(draft.preferred_student_year || draft.preferred_majors);
  }, [draft, step]);

  async function handleCvUpload(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      setUploadStatus("File is too large. Please upload a file under 10MB.");
      return;
    }
    setUploadStatus("Parsing CV...");
    try {
      const text = await extractTextFromFile(file);
      const result = await parseResumeWithLlm("professor", text);
      const parsed = result.data;
      setDraft((prev) => ({
        ...prev,
        cv_file_name: file.name,
        cv_url: `uploaded:${file.name}`,
        full_name: prev.full_name || parsed.full_name || "",
        university: prev.university || parsed.university || "",
        department: prev.department || parsed.department || "",
        title: prev.title || parsed.title || "",
        office_location: prev.office_location || parsed.office_location || "",
        lab_website: prev.lab_website || parsed.lab_website || "",
        google_scholar_url: prev.google_scholar_url || parsed.google_scholar_url || "",
        orcid: prev.orcid || parsed.orcid || "",
        research_fields: prev.research_fields || parsed.research_fields || "",
        research_keywords: prev.research_keywords || parsed.research_keywords || "",
        research_summary: prev.research_summary || parsed.research_summary || "",
        preferred_experience_level:
          prev.preferred_experience_level || parsed.preferred_experience_level || "",
        preferred_student_year: prev.preferred_student_year || parsed.preferred_student_year || "",
        preferred_majors: prev.preferred_majors || parsed.preferred_majors || "",
        mentorship_style: prev.mentorship_style || parsed.mentorship_style || "",
        lab_culture: prev.lab_culture || parsed.lab_culture || "",
      }));
      setUploadStatus(result.message ?? "CV parsed. Fields were auto-filled where possible.");
    } catch {
      setUploadStatus("Could not parse this file. You can continue filling manually.");
    }
  }

  return (
    <form action={completeProfessorOnboarding} className="mt-2 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
      <div className="mb-8 space-y-3">
        <h2 className="text-5xl font-semibold tracking-tight text-ll-navy">{activeHeader.title}</h2>
        <p className="max-w-3xl text-xl leading-relaxed text-zinc-600">{activeHeader.description}</p>
      </div>
      <div className="hidden">
        {Object.entries(draft).map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}
      </div>
      <div className="mb-5 h-3 w-full overflow-hidden rounded-full bg-zinc-100">
        <div
          className="h-full bg-ll-navy transition-all"
          style={{ width: `${(step / steps.length) * 100}%` }}
        />
      </div>
      <p className="text-sm font-semibold uppercase tracking-wider text-ll-gray">
        Step {step} of {steps.length} - {steps[step - 1]}
      </p>

      {step === 1 ? (
        <div className="mt-6 grid gap-5">
          <div className="space-y-3">
            <label htmlFor="cv_upload" className="flex items-center gap-2 text-base font-semibold text-ll-navy">
              Upload CV
              <span className="text-sm font-normal text-zinc-500">(optional but recommended)</span>
            </label>
            <input
              ref={cvInputRef}
              id="cv_upload"
              name="cv_upload"
              type="file"
              accept=".pdf,.txt,.md"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleCvUpload(file);
              }}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => cvInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 px-6 py-12 text-center transition hover:bg-zinc-100"
            >
              <span className="rounded-lg border border-zinc-300 bg-white p-3 text-zinc-500">
                <Upload className="h-7 w-7" />
              </span>
              <span className="text-3xl font-semibold text-zinc-800">Upload your CV</span>
              <span className="text-xl text-zinc-500">PDF or TXT (Max 10MB)</span>
              <span className="rounded-xl bg-[#0f3441] px-8 py-3 text-xl font-semibold uppercase tracking-widest text-white">
                Choose File
              </span>
            </button>
            <p className="text-sm text-ll-gray">
              Uploading a CV will auto-populate as many fields as possible.
            </p>
            {draft.cv_file_name ? (
              <p className="text-sm font-medium text-zinc-700">Uploaded: {draft.cv_file_name}</p>
            ) : null}
            {uploadStatus ? <p className="text-sm text-ll-gray">{uploadStatus}</p> : null}
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="mt-6 grid gap-5">
          <Field label="Full name" name="full_name" value={draft.full_name} onChange={setDraft} required />
          <Field
            label="Title"
            name="title"
            value={draft.title}
            onChange={setDraft}
            placeholder="Assistant Professor"
          />
          <Field label="University" name="university" value={draft.university} onChange={setDraft} required />
          <Field label="Department" name="department" value={draft.department} onChange={setDraft} />
          <Field label="Office location" name="office_location" value={draft.office_location} onChange={setDraft} />
          <Field
            label="Lab website"
            name="lab_website"
            value={draft.lab_website}
            onChange={setDraft}
            placeholder="https://..."
            hint="Optional public URL."
          />
          <Field
            label="Google Scholar URL"
            name="google_scholar_url"
            value={draft.google_scholar_url}
            onChange={setDraft}
          />
          <Field label="ORCID" name="orcid" value={draft.orcid} onChange={setDraft} />
        </div>
      ) : null}

      {step === 3 ? (
        <div className="mt-6 grid gap-5">
          <TagField
            label="Research fields"
            name="research_fields"
            value={draft.research_fields}
            onChange={setDraft}
            placeholder="Neuroscience"
            required
            hint="Use broad fields first, then keywords below."
          />
          <TagField
            label="Research keywords"
            name="research_keywords"
            value={draft.research_keywords}
            onChange={setDraft}
            placeholder="CRISPR"
            hint="Technique and topic tags."
          />
          <div className="space-y-2">
            <label htmlFor="research_summary" className="flex items-center gap-2 text-base font-medium text-ll-navy">
              Research summary
              <span className="text-sm text-zinc-500">(optional)</span>
            </label>
            <textarea
              id="research_summary"
              name="research_summary"
              value={draft.research_summary}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, research_summary: event.target.value }))
              }
              rows={4}
              className="w-full min-h-[120px] rounded-xl border border-zinc-300 px-4 py-3 text-base"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="preferred_experience_level" className="flex items-center gap-2 text-base font-medium text-ll-navy">
              Preferred experience level
              <span className="text-sm text-zinc-500">(optional)</span>
            </label>
            <select
              id="preferred_experience_level"
              name="preferred_experience_level"
              value={draft.preferred_experience_level}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, preferred_experience_level: event.target.value }))
              }
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-base"
            >
              <option value="">Select one</option>
              <option value="none">No experience needed</option>
              <option value="intro_courses">Intro courses completed</option>
              <option value="prior_experience">Prior lab/clinical experience</option>
            </select>
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="mt-6 grid gap-5">
          <div className="space-y-2">
            <label htmlFor="mentorship_style" className="flex items-center gap-2 text-base font-medium text-ll-navy">
              Mentorship style
              <span className="text-sm text-zinc-500">(optional)</span>
            </label>
            <select
              id="mentorship_style"
              name="mentorship_style"
              value={draft.mentorship_style}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, mentorship_style: event.target.value }))
              }
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-base"
            >
              <option value="">Select one</option>
              <option value="hands_on">Hands-on guidance</option>
              <option value="independent">Independent work encouraged</option>
              <option value="collaborative">Collaborative team mentorship</option>
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="lab_culture" className="flex items-center gap-2 text-base font-medium text-ll-navy">
              Lab culture
              <span className="text-sm text-zinc-500">(optional)</span>
            </label>
            <select
              id="lab_culture"
              name="lab_culture"
              value={draft.lab_culture}
              onChange={(event) => setDraft((prev) => ({ ...prev, lab_culture: event.target.value }))}
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-base"
            >
              <option value="">Select one</option>
              <option value="fast_paced">Fast-paced</option>
              <option value="collaborative">Collaborative</option>
              <option value="clinical">Clinical / patient-facing</option>
              <option value="computation_heavy">Computation-heavy</option>
              <option value="mentorship_focused">Mentorship-focused</option>
            </select>
          </div>
        </div>
      ) : null}

      {step === 5 ? (
        <div className="mt-6 grid gap-5">
          <MultiSelectDropdown
            label="Preferred student year"
            values={splitValues(draft.preferred_student_year)}
            options={[
              { value: "freshman", label: "Freshman" },
              { value: "sophomore", label: "Sophomore" },
              { value: "junior", label: "Junior" },
              { value: "senior", label: "Senior" },
              { value: "graduate", label: "Graduate" },
            ]}
            onChange={(selected) =>
              setDraft((prev) => ({ ...prev, preferred_student_year: selected.join(", ") }))
            }
            placeholder="Select student years"
          />
          <MultiSelectDropdown
            label="Preferred majors"
            values={splitValues(draft.preferred_majors)}
            options={[
              { value: "Biology", label: "Biology" },
              { value: "Chemistry", label: "Chemistry" },
              { value: "Computer Science", label: "Computer Science" },
              { value: "Neuroscience", label: "Neuroscience" },
              { value: "Biomedical Engineering", label: "Biomedical Engineering" },
              { value: "Psychology", label: "Psychology" },
              { value: "Public Health", label: "Public Health" },
            ]}
            onChange={(selected) =>
              setDraft((prev) => ({ ...prev, preferred_majors: selected.join(", ") }))
            }
            placeholder="Select majors"
          />
          <div className="space-y-2">
            <label htmlFor="profile_visibility" className="flex items-center gap-2 text-base font-medium text-ll-navy">
              Profile visibility
              <span className="text-sm text-zinc-500">(optional)</span>
            </label>
            <select
              id="profile_visibility"
              name="profile_visibility"
              value={draft.profile_visibility}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, profile_visibility: event.target.value }))
              }
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-base"
            >
              <option value="public">Public</option>
              <option value="university_only">University only</option>
            </select>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="notify_new_applications" className="flex items-center gap-2 text-base font-medium text-ll-navy">
                Notify new applications
                <span className="text-sm text-zinc-500">(optional)</span>
              </label>
              <select
                id="notify_new_applications"
                name="notify_new_applications"
                value={draft.notify_new_applications}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, notify_new_applications: event.target.value }))
                }
                className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-base"
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="notify_weekly_digest" className="flex items-center gap-2 text-base font-medium text-ll-navy">
                Notify weekly digest
                <span className="text-sm text-zinc-500">(optional)</span>
              </label>
              <select
                id="notify_weekly_digest"
                name="notify_weekly_digest"
                value={draft.notify_weekly_digest}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, notify_weekly_digest: event.target.value }))
                }
                className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-base"
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep((current) => Math.max(1, current - 1))}
          disabled={step === 1}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-300 px-6 py-3 text-base font-medium text-zinc-700 disabled:opacity-50"
        >
          <ArrowLeft className="h-5 w-5 shrink-0" aria-hidden />
          Back
        </button>

        {step < maxStep ? (
          <div className="flex flex-col items-end gap-2">
            {!canContinue ? (
              <p className="text-sm text-red-600">Fill required fields before continuing.</p>
            ) : null}
            <button
              type="button"
              onClick={() => setStep((current) => Math.min(maxStep, current + 1))}
              disabled={!canContinue}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-ll-navy px-6 py-3 text-base font-medium text-white disabled:opacity-60"
            >
              Continue
              <ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
            </button>
          </div>
        ) : (
          <button
            type="submit"
            className="rounded-full bg-ll-navy px-6 py-3 text-base font-medium text-white"
          >
            Complete onboarding
          </button>
        )}
      </div>
    </form>
  );
}

function splitValues(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function extractTextFromFile(file: File): Promise<string> {
  const fileName = file.name.toLowerCase();
  if (fileName.endsWith(".pdf")) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    try {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/legacy/build/pdf.worker.mjs",
        import.meta.url,
      ).toString();
      const doc = await pdfjs.getDocument({ data: bytes }).promise;
      let text = "";
      for (let page = 1; page <= doc.numPages; page += 1) {
        const pageData = await doc.getPage(page);
        const content = await pageData.getTextContent();
        text += `${content.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ")}\n`;
      }
      return text;
    } catch {
      // Fallback for malformed/scanned PDFs: return best-effort decoded text.
      return new TextDecoder("utf-8").decode(bytes);
    }
  }
  return file.text();
}

function Field({
  label,
  name,
  value,
  onChange,
  placeholder,
  required,
  hint,
}: {
  label: string;
  name: keyof ProfessorDraft;
  value: string;
  onChange: Dispatch<SetStateAction<ProfessorDraft>>;
  placeholder?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="flex items-center gap-2 text-base font-medium text-ll-navy">
        {label}
        {required ? (
          <span className="text-sm font-semibold text-red-600">(required)</span>
        ) : (
          <span className="text-sm text-zinc-500">(optional)</span>
        )}
      </label>
      <input
        id={name}
        name={name}
        value={value}
        onChange={(event) => onChange((prev) => ({ ...prev, [name]: event.target.value }))}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-base"
      />
      {hint ? <p className="text-sm text-ll-gray">{hint}</p> : null}
    </div>
  );
}

function TagField({
  label,
  name,
  value,
  onChange,
  placeholder,
  required,
  hint,
}: {
  label: string;
  name: keyof ProfessorDraft;
  value: string;
  onChange: Dispatch<SetStateAction<ProfessorDraft>>;
  placeholder?: string;
  required?: boolean;
  hint?: string;
}) {
  const [pending, setPending] = useState("");
  const tags = value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  function addTag(raw: string) {
    const tag = raw.trim();
    if (!tag) return;
    if (tags.some((existing) => existing.toLowerCase() === tag.toLowerCase())) return;
    onChange((prev) => ({ ...prev, [name]: [...tags, tag].join(", ") }));
    setPending("");
  }

  function removeTag(tagToRemove: string) {
    const next = tags.filter((tag) => tag !== tagToRemove);
    onChange((prev) => ({ ...prev, [name]: next.join(", ") }));
  }

  return (
    <div className="space-y-2">
      <label htmlFor={name} className="flex items-center gap-2 text-base font-medium text-ll-navy">
        {label}
        {required ? (
          <span className="text-sm font-semibold text-red-600">(required)</span>
        ) : (
          <span className="text-sm text-zinc-500">(optional)</span>
        )}
      </label>
      <input
        id={name}
        name={name}
        value={pending}
        onChange={(event) => setPending(event.target.value)}
        onBlur={() => addTag(pending)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            addTag(pending);
          }
        }}
        placeholder={placeholder}
        required={required && tags.length === 0}
        className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-base"
      />
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700"
            >
              {tag}
              <button
                type="button"
                aria-label={`Remove ${tag}`}
                onClick={() => removeTag(tag)}
                className="text-zinc-500 hover:text-zinc-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
      {hint ? (
        <p className="text-sm text-ll-gray">
          {hint} Type a value and press Enter or comma to add a tag. Click x to remove.
        </p>
      ) : (
        <p className="text-sm text-ll-gray">
          Type a value and press Enter or comma to add a tag. Click x to remove.
        </p>
      )}
    </div>
  );
}
