"use client";

import { useMemo } from "react";
import { useFormStatus } from "react-dom";
import { Upload } from "lucide-react";
import { saveStudentProfile } from "./actions";

type StudentProfileValues = {
  display_name: string;
  email: string;
  avatar_url: string;
  full_name: string;
  university: string;
  major: string;
  minor: string;
  year: string;
  graduation_month: string;
  graduation_year: string;
  gpa: string;
  is_gpa_visible: string;
  willing_to_volunteer: string;
  research_fields: string;
  research_topics: string;
  ranked_interests: string;
  skills: string;
  programming_languages: string;
  lab_equipment: string;
  software_tools: string;
  prior_experience: string;
  experience_details: string;
  relevant_courses: string;
  parsed_courses: string;
  role_types_sought: string;
  experience_types: string;
  priorities: string;
  motivations: string;
  time_commitment: string;
  paid_preference: string;
  start_availability: string;
  honors_or_awards: string;
  publications: string;
  resume_url: string;
  transcript_url: string;
};

export function StudentProfileEditor({
  values,
  saved,
}: {
  values: StudentProfileValues;
  saved: boolean;
}) {
  const avatarSrc = useMemo(() => values.avatar_url || "/window.svg", [values.avatar_url]);

  return (
    <form action={saveStudentProfile} className="mx-auto w-full max-w-6xl space-y-5">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-ll-navy md:text-4xl">{values.full_name || "My Profile"}</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Edit every student field in one place. Array fields accept comma-separated values.
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
          <img src={avatarSrc} alt="Student avatar" className="h-64 w-full rounded-2xl object-cover" />
          <CompactUpload
            label="Upload profile photo"
            inputId="avatar_file"
            name="avatar_file"
            accept=".png,.jpg,.jpeg,.webp"
            helperText="PNG, JPG, or WEBP."
          />
          <Input label="Display name" name="display_name" defaultValue={values.display_name} />
          <Input label="Full name" name="full_name" defaultValue={values.full_name} />
          <Input label="Email" name="email" defaultValue={values.email} />
          <Input label="University" name="university" defaultValue={values.university} />
          <Input label="Year" name="year" defaultValue={values.year} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Grad month" name="graduation_month" defaultValue={values.graduation_month} />
            <Input label="Grad year" name="graduation_year" defaultValue={values.graduation_year} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="GPA" name="gpa" defaultValue={values.gpa} />
          </div>
          <Select
            label="GPA visible"
            name="is_gpa_visible"
            defaultValue={values.is_gpa_visible}
            options={[
              { label: "Yes", value: "true" },
              { label: "No", value: "false" },
            ]}
          />
          <Select
            label="Willing to volunteer"
            name="willing_to_volunteer"
            defaultValue={values.willing_to_volunteer}
            options={[
              { label: "Yes", value: "true" },
              { label: "No", value: "false" },
            ]}
          />
        </section>

        <div className="space-y-5">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-ll-navy">Research Biography</h2>
            <Textarea
              label="Biography / experience details"
              name="experience_details"
              defaultValue={values.experience_details}
              rows={6}
            />
            <Textarea label="Publications" name="publications" defaultValue={values.publications} rows={4} />
            <Textarea label="Honors / awards" name="honors_or_awards" defaultValue={values.honors_or_awards} rows={3} />
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-ll-navy">Academic + Skills</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Input label="Major(s)" name="major" defaultValue={values.major} />
              <Input label="Minor(s)" name="minor" defaultValue={values.minor} />
              <Input label="Relevant courses" name="relevant_courses" defaultValue={values.relevant_courses} />
              <Input label="Parsed courses" name="parsed_courses" defaultValue={values.parsed_courses} />
              <Input label="Research fields" name="research_fields" defaultValue={values.research_fields} />
              <Input label="Research topics" name="research_topics" defaultValue={values.research_topics} />
              <Input label="Ranked interests" name="ranked_interests" defaultValue={values.ranked_interests} />
              <Input label="Skills" name="skills" defaultValue={values.skills} />
              <Input label="Programming languages" name="programming_languages" defaultValue={values.programming_languages} />
              <Input label="Lab equipment" name="lab_equipment" defaultValue={values.lab_equipment} />
              <Input label="Software tools" name="software_tools" defaultValue={values.software_tools} />
              <Input label="Prior experience" name="prior_experience" defaultValue={values.prior_experience} />
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-ll-navy">Preferences + Goals</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Input label="Role types sought" name="role_types_sought" defaultValue={values.role_types_sought} />
              <Input label="Experience types" name="experience_types" defaultValue={values.experience_types} />
              <Input label="Priorities" name="priorities" defaultValue={values.priorities} />
              <Input label="Motivations" name="motivations" defaultValue={values.motivations} />
              <Input label="Time commitment" name="time_commitment" defaultValue={values.time_commitment} />
              <Input label="Paid preference" name="paid_preference" defaultValue={values.paid_preference} />
              <Input label="Start availability" name="start_availability" defaultValue={values.start_availability} />
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-ll-navy">Documents</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <CompactUpload
                label="Resume file"
                inputId="resume_file"
                name="resume_file"
                helperText={values.resume_url ? "A resume is already on file. Upload to replace it." : undefined}
              />
              <CompactUpload
                label="Transcript file"
                inputId="transcript_file"
                name="transcript_file"
                helperText={values.transcript_url ? "A transcript is already on file. Upload to replace it." : undefined}
              />
            </div>
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
      className="inline-flex items-center justify-center rounded-lg bg-ll-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
    >
      {pending ? "Saving..." : "Save profile"}
    </button>
  );
}

function Input({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string;
}) {
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

function Textarea({
  label,
  name,
  defaultValue,
  rows = 4,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  rows?: number;
}) {
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
        <span className="text-xs text-zinc-500">PDF</span>
      </label>
      <input id={inputId} name={name} type="file" accept={accept} className="hidden" />
      {helperText ? <p className="text-xs text-zinc-500">{helperText}</p> : null}
    </div>
  );
}
