"use client";

import { useMemo } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Upload } from "lucide-react";
import { saveProfessorProfile } from "./actions";

export type ProfessorProfileValues = {
  display_name: string;
  email: string;
  avatar_url: string;
  full_name: string;
  title: string;
  university: string;
  department: string;
  office_location: string;
  lab_website: string;
  cv_url: string;
  google_scholar_url: string;
  orcid: string;
  research_fields: string;
  research_keywords: string;
  research_summary: string;
  preferred_student_year: string;
  preferred_majors: string;
  preferred_experience_level: string;
  mentorship_style: string;
  lab_culture: string;
  profile_visibility: string;
  notify_new_applications: string;
  notify_weekly_digest: string;
};

export function ProfessorProfileEditor({ values, saved }: { values: ProfessorProfileValues; saved: boolean }) {
  const avatarSrc = useMemo(() => values.avatar_url || "/window.svg", [values.avatar_url]);

  return (
    <form action={saveProfessorProfile} className="mx-auto w-full max-w-6xl space-y-5">
      <p className="text-sm text-zinc-600">
        <Link href="/dashboard/professor" className="font-medium text-ll-navy underline">
          ← Overview
        </Link>
      </p>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-ll-navy md:text-4xl">
              {values.full_name || "My profile"}
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              Edit your lab-facing profile. Comma-separated fields accept several values; leave blank if you prefer not
              to say.
            </p>
          </div>
          <SaveButton />
        </div>
        {saved ? (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Profile saved.
          </p>
        ) : null}
      </section>

      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <section className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <img src={avatarSrc} alt="Profile" className="h-64 w-full rounded-2xl object-cover" />
          <CompactUpload
            label="Upload profile photo"
            inputId="avatar_file"
            name="avatar_file"
            accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
            helperText="PNG, JPG, or WEBP."
          />
          <Input label="Display name" name="display_name" defaultValue={values.display_name} />
          <Input label="Full name" name="full_name" defaultValue={values.full_name} />
          <Input label="Email" name="email" defaultValue={values.email} />
          <Input label="Title" name="title" defaultValue={values.title} />
          <Input label="University" name="university" defaultValue={values.university} />
          <Input label="Department" name="department" defaultValue={values.department} />
          <Input label="Office" name="office_location" defaultValue={values.office_location} />
        </section>

        <div className="space-y-5">
          <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-ll-navy">Online presence & research</h2>
            <Input label="Lab website" name="lab_website" defaultValue={values.lab_website} />
            <Textarea
              label="Research summary"
              name="research_summary"
              defaultValue={values.research_summary}
              rows={5}
            />
            <Textarea
              label="Research fields (comma-separated)"
              name="research_fields"
              defaultValue={values.research_fields}
              rows={3}
            />
            <Textarea
              label="Research keywords (comma-separated)"
              name="research_keywords"
              defaultValue={values.research_keywords}
              rows={3}
            />
            <Input label="Google Scholar" name="google_scholar_url" defaultValue={values.google_scholar_url} />
            <Input label="ORCID" name="orcid" defaultValue={values.orcid} />
            <div className="pt-1">
              <DocumentLink label="Current CV" href={values.cv_url} />
            </div>
            <CompactUpload
              label="Upload CV (PDF)"
              inputId="cv_file"
              name="cv_file"
              accept=".pdf,application/pdf"
            />
          </section>

          <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-ll-navy">Mentoring & lab</h2>
            <Textarea
              label="Preferred student year (comma-separated, e.g. Sophomore, Junior)"
              name="preferred_student_year"
              defaultValue={values.preferred_student_year}
              rows={2}
            />
            <Textarea
              label="Preferred majors (comma-separated)"
              name="preferred_majors"
              defaultValue={values.preferred_majors}
              rows={2}
            />
            <Input
              label="Preferred experience level"
              name="preferred_experience_level"
              defaultValue={values.preferred_experience_level}
            />
            <Textarea
              label="Mentorship style (comma-separated)"
              name="mentorship_style"
              defaultValue={values.mentorship_style}
              rows={2}
            />
            <Textarea label="Lab culture (comma-separated)" name="lab_culture" defaultValue={values.lab_culture} rows={2} />
          </section>

          <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-ll-navy">Privacy & notifications</h2>
            <Select
              label="Profile visibility"
              name="profile_visibility"
              defaultValue={values.profile_visibility}
              options={[
                { label: "Public", value: "public" },
                { label: "University only", value: "university_only" },
              ]}
            />
            <Select
              label="Notify on new applications"
              name="notify_new_applications"
              defaultValue={values.notify_new_applications}
              options={[
                { label: "Yes", value: "true" },
                { label: "No", value: "false" },
              ]}
            />
            <Select
              label="Weekly digest email"
              name="notify_weekly_digest"
              defaultValue={values.notify_weekly_digest}
              options={[
                { label: "Yes", value: "true" },
                { label: "No", value: "false" },
              ]}
            />
          </section>
        </div>
      </div>
    </form>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-full bg-ll-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
    >
      {pending ? "Saving..." : "Save profile"}
    </button>
  );
}

function Input({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string }) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
      />
    </label>
  );
}

function Textarea({ label, name, defaultValue, rows = 4 }: { label: string; name: string; defaultValue?: string; rows?: number }) {
  return (
    <label className="mt-3 block space-y-1">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
      />
    </label>
  );
}

function Select({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function CompactUpload({
  label,
  inputId,
  name,
  helperText,
  accept = ".pdf",
}: {
  label: string;
  inputId: string;
  name: string;
  helperText?: string;
  accept?: string;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </label>
      <label
        htmlFor={inputId}
        className="flex cursor-pointer items-center justify-between rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
      >
        <span className="inline-flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Choose file
        </span>
        <span className="text-xs text-zinc-500">Upload to replace</span>
      </label>
      <input id={inputId} name={name} type="file" accept={accept} className="hidden" />
      {helperText ? <p className="text-xs text-zinc-500">{helperText}</p> : null}
    </div>
  );
}

function DocumentLink({ label, href }: { label: string; href?: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      {href ? (
        <a href={href} className="text-sm font-medium text-ll-navy underline" target="_blank" rel="noreferrer">
          Open file
        </a>
      ) : (
        <p className="text-sm text-zinc-500">No file uploaded</p>
      )}
    </div>
  );
}
