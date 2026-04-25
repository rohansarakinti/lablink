"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { useFormStatus } from "react-dom";
import { Upload } from "lucide-react";
import { saveStudentProfile } from "./actions";
import { createClient } from "@/lib/supabase/client";

export type StudentProfileValues = {
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
  readOnly = false,
}: {
  values: StudentProfileValues;
  saved: boolean;
  readOnly?: boolean;
}) {
  const [avatarSrc, setAvatarSrc] = useState(values.avatar_url || "/window.svg");
  const [avatarUrl, setAvatarUrl] = useState(values.avatar_url || "");
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  const resumeFileName = useMemo(() => getFileNameFromUrl(values.resume_url), [values.resume_url]);

  const onAvatarSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setAvatarUploadError(null);
    setAvatarUploading(true);
    setAvatarSrc(URL.createObjectURL(file));

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setAvatarUploadError("Sign in again, then retry the upload.");
        return;
      }

      const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const filePath = `avatars/${user.id}/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from("lab-assets").upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });
      if (error) {
        setAvatarUploadError(error.message);
        return;
      }

      const { data } = supabase.storage.from("lab-assets").getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
      setAvatarSrc(data.publicUrl);
    } catch (error) {
      setAvatarUploadError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setAvatarUploading(false);
      event.target.value = "";
    }
  };

  return (
    <form action={readOnly ? undefined : saveStudentProfile} className="mx-auto w-full max-w-6xl space-y-5">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-ll-navy md:text-4xl">{values.full_name || "My Profile"}</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Edit every student field in one place. Array fields accept comma-separated values.
            </p>
          </div>
          {!readOnly ? <SaveButton /> : null}
        </div>
        {saved && !readOnly ? (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Profile saved.
          </p>
        ) : null}
      </section>

      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <section className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <img src={avatarSrc} alt="Student avatar" className="h-64 w-full rounded-2xl object-cover" />
          <input type="hidden" name="avatar_url" value={avatarUrl} />
          <CompactUpload
            label="Upload profile photo"
            inputId="avatar_file"
            accept=".png,.jpg,.jpeg,.webp"
            helperText={avatarUploadError ?? (avatarUploading ? "Uploading..." : "PNG, JPG, or WEBP.")}
            hidden={readOnly}
            badge={avatarUploadError ? "Upload failed" : avatarUploading ? "Uploading..." : "Image"}
            onChange={onAvatarSelected}
          />
          <Input label="Display name" name="display_name" defaultValue={values.display_name} readOnly={readOnly} />
          <Input label="Full name" name="full_name" defaultValue={values.full_name} readOnly={readOnly} />
          <Input label="Email" name="email" defaultValue={values.email} readOnly={readOnly} />
          <Input label="University" name="university" defaultValue={values.university} readOnly={readOnly} />
          <Input label="Year" name="year" defaultValue={values.year} readOnly={readOnly} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Grad month" name="graduation_month" defaultValue={values.graduation_month} readOnly={readOnly} />
            <Input label="Grad year" name="graduation_year" defaultValue={values.graduation_year} readOnly={readOnly} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="GPA" name="gpa" defaultValue={values.gpa} readOnly={readOnly} />
          </div>
          <Select
            label="GPA visible"
            name="is_gpa_visible"
            defaultValue={values.is_gpa_visible}
            disabled={readOnly}
            options={[
              { label: "Yes", value: "true" },
              { label: "No", value: "false" },
            ]}
          />
          <Select
            label="Willing to volunteer"
            name="willing_to_volunteer"
            defaultValue={values.willing_to_volunteer}
            disabled={readOnly}
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
              readOnly={readOnly}
            />
            <Textarea label="Publications" name="publications" defaultValue={values.publications} rows={4} readOnly={readOnly} />
            <Textarea label="Honors / awards" name="honors_or_awards" defaultValue={values.honors_or_awards} rows={3} readOnly={readOnly} />
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-ll-navy">Academic + Skills</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Input label="Major(s)" name="major" defaultValue={values.major} readOnly={readOnly} />
              <Input label="Minor(s)" name="minor" defaultValue={values.minor} readOnly={readOnly} />
              <Input label="Relevant courses" name="relevant_courses" defaultValue={values.relevant_courses} readOnly={readOnly} />
              <Input label="Research fields" name="research_fields" defaultValue={values.research_fields} readOnly={readOnly} />
              <Input label="Research topics" name="research_topics" defaultValue={values.research_topics} readOnly={readOnly} />
              <Input label="Ranked interests" name="ranked_interests" defaultValue={values.ranked_interests} readOnly={readOnly} />
              <Input label="Skills" name="skills" defaultValue={values.skills} readOnly={readOnly} />
              <Input label="Programming languages" name="programming_languages" defaultValue={values.programming_languages} readOnly={readOnly} />
              <Input label="Lab equipment" name="lab_equipment" defaultValue={values.lab_equipment} readOnly={readOnly} />
              <Input label="Software tools" name="software_tools" defaultValue={values.software_tools} readOnly={readOnly} />
              <Input label="Prior experience" name="prior_experience" defaultValue={values.prior_experience} readOnly={readOnly} />
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-ll-navy">Preferences + Goals</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Input label="Role types sought" name="role_types_sought" defaultValue={values.role_types_sought} readOnly={readOnly} />
              <Input label="Experience types" name="experience_types" defaultValue={values.experience_types} readOnly={readOnly} />
              <Input label="Priorities" name="priorities" defaultValue={values.priorities} readOnly={readOnly} />
              <Input label="Motivations" name="motivations" defaultValue={values.motivations} readOnly={readOnly} />
              <Input label="Time commitment" name="time_commitment" defaultValue={values.time_commitment} readOnly={readOnly} />
              <Input label="Paid preference" name="paid_preference" defaultValue={values.paid_preference} readOnly={readOnly} />
              <Input label="Start availability" name="start_availability" defaultValue={values.start_availability} readOnly={readOnly} />
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-ll-navy">Documents</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <CompactUpload
                label="Resume file"
                inputId="resume_file"
                name="resume_file"
                helperText={
                  values.resume_url
                    ? `Current file: ${resumeFileName ?? "uploaded resume"}. Upload to replace it.`
                    : undefined
                }
                hidden={readOnly}
              />
              <CompactUpload
                label="Transcript file"
                inputId="transcript_file"
                name="transcript_file"
                helperText={values.transcript_url ? "A transcript is already on file. Upload to replace it." : undefined}
                hidden={readOnly}
              />
              {readOnly ? (
                <>
                  <DocumentLink label="Resume on file" href={values.resume_url} />
                  <DocumentLink label="Transcript / cover letter on file" href={values.transcript_url} />
                </>
              ) : null}
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
  readOnly = false,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  readOnly?: boolean;
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        readOnly={readOnly}
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
  readOnly = false,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  rows?: number;
  readOnly?: boolean;
}) {
  return (
    <label className="mt-3 block space-y-1">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        readOnly={readOnly}
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
  disabled = false,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: Array<{ label: string; value: string }>;
  disabled?: boolean;
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        disabled={disabled}
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
  onChange,
  accept = ".pdf",
  hidden = false,
  badge = "PDF",
}: {
  label: string;
  inputId: string;
  name?: string;
  helperText?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  accept?: string;
  hidden?: boolean;
  badge?: string;
}) {
  if (hidden) return null;

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
        <span className="text-xs text-zinc-500">{badge}</span>
      </label>
      <input id={inputId} name={name} type="file" accept={accept} onChange={onChange} className="hidden" />
      {helperText ? <p className="text-xs text-zinc-500">{helperText}</p> : null}
    </div>
  );
}

function DocumentLink({ label, href }: { label: string; href?: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      {href ? (
        <a href={href} className="text-sm font-medium text-ll-navy underline">
          Open file
        </a>
      ) : (
        <p className="text-sm text-zinc-500">No file</p>
      )}
    </div>
  );
}

function getFileNameFromUrl(url?: string) {
  if (!url) return null;
  try {
    const pathname = new URL(url).pathname;
    const rawName = pathname.split("/").pop();
    if (!rawName) return null;
    return decodeURIComponent(rawName);
  } catch {
    const rawName = url.split("?")[0]?.split("/").pop();
    return rawName ? decodeURIComponent(rawName) : null;
  }
}
