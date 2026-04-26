"use client";

import { type Dispatch, type SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Upload } from "lucide-react";
import { completeStudentOnboarding } from "./actions";
import type { StudentAutofill } from "@/lib/onboarding/autofill";
import { parseOnboardingFileForRole } from "@/lib/onboarding/parse-onboarding-file";
import { MultiSelectDropdown } from "@/components/multi-select-dropdown";

type StudentDraft = {
  full_name: string;
  university: string;
  year: string;
  graduation_month: string;
  graduation_year: string;
  gpa: string;
  major: string;
  minor: string;
  research_fields: string;
  research_topics: string;
  ranked_interests: string;
  skills: string;
  programming_languages: string;
  lab_equipment: string;
  software_tools: string;
  prior_experience: string;
  experience_details: string;
  transcript_url: string;
  resume_url: string;
  relevant_courses: string;
  honors_or_awards: string;
  publications: string;
  role_types_sought: string;
  time_commitment: string;
  paid_preference: string;
  experience_types: string;
  motivations: string;
  priorities: string;
  start_availability: string;
  parsed_gpa: string;
  is_gpa_visible: string;
  willing_to_volunteer: string;
  resume_file_name: string;
};

const initialDraft: StudentDraft = {
  full_name: "",
  university: "",
  year: "",
  graduation_month: "",
  graduation_year: "",
  gpa: "",
  major: "",
  minor: "",
  research_fields: "",
  research_topics: "",
  ranked_interests: "",
  skills: "",
  programming_languages: "",
  lab_equipment: "",
  software_tools: "",
  prior_experience: "",
  experience_details: "",
  transcript_url: "",
  resume_url: "",
  relevant_courses: "",
  honors_or_awards: "",
  publications: "",
  role_types_sought: "",
  time_commitment: "",
  paid_preference: "",
  experience_types: "",
  motivations: "",
  priorities: "",
  start_availability: "",
  parsed_gpa: "",
  is_gpa_visible: "true",
  willing_to_volunteer: "true",
  resume_file_name: "",
};

const storageKey = "lablink_student_onboarding_draft";
const steps = [
  "Upload resume",
  "Basic info",
  "Research interests",
  "Skills",
  "Goals",
  "Preferences",
];

const stepHeaders = [
  {
    title: "Resume Upload",
    description:
      "Share your resume to auto-fill key details and speed up onboarding. You can still complete every field manually.",
  },
  {
    title: "Academic Background",
    description:
      "Tell us about your current scholarly pursuits so we can surface labs and opportunities that match your training.",
  },
  {
    title: "Research Interests",
    description:
      "Highlight the fields and topics you want to explore so your matches prioritize the work you care about most.",
  },
  {
    title: "Skills and Experience",
    description:
      "Showcase your practical strengths, tools, and prior exposure so labs can quickly understand how you can contribute.",
  },
  {
    title: "Goals and Priorities",
    description:
      "Describe what you are hoping to gain from research so we can tailor opportunities to your academic direction.",
  },
  {
    title: "Availability and Preferences",
    description:
      "Set your weekly commitment and compensation preferences to receive matches that fit your schedule and needs.",
  },
];

const roleTypesSoughtOptions = [
  { value: "undergrad_ra", label: "Undergraduate RA" },
  { value: "graduate_ra", label: "Graduate RA" },
  { value: "clinical_assistant", label: "Clinical assistant" },
  { value: "data_analyst", label: "Data analyst" },
  { value: "literature_review", label: "Literature review" },
];

const experienceTypesOptions = [
  { value: "hands_on_lab", label: "Hands-on lab work" },
  { value: "clinical", label: "Clinical exposure" },
  { value: "computational", label: "Computational research" },
  { value: "writing", label: "Writing and publication support" },
  { value: "mentorship", label: "Close mentorship" },
];

const prioritiesOptions = [
  { value: "hands_on", label: "Hands-on learning" },
  { value: "publication", label: "Publication opportunity" },
  { value: "flexible_schedule", label: "Flexible schedule" },
  { value: "paid", label: "Paid opportunity" },
  { value: "career_exploration", label: "Career exploration" },
];

const paidPreferenceOptions = [
  { value: "paid_only", label: "Paid only" },
  { value: "open_to_unpaid", label: "Open to unpaid" },
  { value: "either", label: "Either paid or unpaid" },
];

export function StudentOnboardingWizard() {
  const [step, setStep] = useState(1);
  const maxStep = steps.length;
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const activeHeader = stepHeaders[step - 1];
  const [draft, setDraft] = useState<StudentDraft>(() => {
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
    if (step === 4) return Boolean(draft.skills);
    if (step === 5) return true;
    if (step === 6) return Boolean(draft.time_commitment && draft.paid_preference);
    return true;
  }, [draft, step]);

  async function handleResumeUpload(file: File, fileInput: HTMLInputElement) {
    setUploadStatus("Reading file and autofill…");
    try {
      const out = await parseOnboardingFileForRole(file, "student");
      if (!out.ok) {
        setUploadStatus(out.message);
        return;
      }
      const { result } = out;
      const parsed = result.data as StudentAutofill;
      setDraft((prev) => ({
        ...prev,
        resume_file_name: file.name,
        resume_url: `uploaded:${file.name}`,
        full_name: prev.full_name || parsed.full_name || "",
        university: prev.university || parsed.university || "",
        year: prev.year || parsed.year || "",
        graduation_month: prev.graduation_month || parsed.graduation_month || "",
        graduation_year: prev.graduation_year || parsed.graduation_year || "",
        gpa: prev.gpa || parsed.gpa || "",
        major: prev.major || parsed.major || "",
        minor: prev.minor || parsed.minor || "",
        skills: prev.skills || parsed.skills || "",
        programming_languages: prev.programming_languages || parsed.programming_languages || "",
        research_fields: prev.research_fields || parsed.research_fields || "",
        research_topics: prev.research_topics || parsed.research_topics || "",
        ranked_interests: prev.ranked_interests || parsed.ranked_interests || "",
        lab_equipment: prev.lab_equipment || parsed.lab_equipment || "",
        software_tools: prev.software_tools || parsed.software_tools || "",
        prior_experience: prev.prior_experience || parsed.prior_experience || "",
        experience_details: prev.experience_details || parsed.experience_details || "",
        relevant_courses: prev.relevant_courses || parsed.relevant_courses || "",
        honors_or_awards: prev.honors_or_awards || parsed.honors_or_awards || "",
        publications: prev.publications || parsed.publications || "",
        role_types_sought: prev.role_types_sought || parsed.role_types_sought || "",
        time_commitment: prev.time_commitment || parsed.time_commitment || "",
        paid_preference: prev.paid_preference || parsed.paid_preference || "",
        experience_types: prev.experience_types || parsed.experience_types || "",
        motivations: prev.motivations || parsed.motivations || "",
        priorities: prev.priorities || parsed.priorities || "",
        start_availability: prev.start_availability || parsed.start_availability || "",
      }));
      setUploadStatus(
        result.message ?? "Resume parsed. Fields were auto-filled where possible.",
      );
    } catch {
      setUploadStatus("Could not parse this file. You can continue filling manually.");
    } finally {
      fileInput.value = "";
    }
  }

  return (
    <form action={completeStudentOnboarding} className="ll-animate-scale-in mt-2 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
      <div className="ll-animate-fade-up mb-8 space-y-3">
        <h2 className="text-5xl font-semibold tracking-tight text-ll-navy">{activeHeader.title}</h2>
        <p className="ll-animate-fade-up ll-delay-100 max-w-3xl text-xl leading-relaxed text-zinc-600">{activeHeader.description}</p>
      </div>
      <div className="hidden">
        {Object.entries(draft).map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}
      </div>
      <div className="mb-5 h-3 w-full overflow-hidden rounded-full bg-zinc-100">
        <div
          className="h-full bg-ll-purple transition-all duration-500"
          style={{ width: `${(step / steps.length) * 100}%` }}
        />
      </div>
      <p className="text-sm font-semibold uppercase tracking-wider text-ll-gray">
        Step {step} of {steps.length} - {steps[step - 1]}
      </p>

      {step === 1 ? (
        <div className="mt-6 grid gap-5">
          <div className="space-y-3">
            <label htmlFor="resume_upload" className="flex items-center gap-2 text-base font-semibold text-ll-navy">
              Upload resume
              <span className="text-sm font-normal text-zinc-500">(optional but recommended)</span>
            </label>
            <input
              ref={resumeInputRef}
              id="resume_upload"
              name="resume_upload"
              type="file"
              accept=".pdf,.txt,.md"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleResumeUpload(file, event.currentTarget);
              }}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => resumeInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 px-6 py-12 text-center transition-all duration-250 hover:-translate-y-0.5 hover:border-zinc-400 hover:bg-zinc-100"
            >
              <span className="rounded-lg border border-zinc-300 bg-white p-3 text-zinc-500">
                <Upload className="h-7 w-7" />
              </span>
              <span className="text-3xl font-semibold text-zinc-800">Upload your Resume</span>
              <span className="text-xl text-zinc-500">PDF or TXT (Max 10MB)</span>
              <span className="rounded-xl bg-[#0f3441] px-8 py-3 text-xl font-semibold uppercase tracking-widest text-white">
                Choose File
              </span>
            </button>
            <p className="text-sm text-ll-gray">
              Uploading a resume will auto-populate as many fields as possible.
            </p>
            {draft.resume_file_name ? (
              <p className="text-sm font-medium text-zinc-700">Uploaded: {draft.resume_file_name}</p>
            ) : null}
            {uploadStatus ? <p className="text-sm text-ll-gray">{uploadStatus}</p> : null}
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="mt-6 grid gap-5">
          <Field label="Full name" name="full_name" value={draft.full_name} onChange={setDraft} required />
          <Field label="University" name="university" value={draft.university} onChange={setDraft} required />
          <div className="space-y-2">
            <label htmlFor="year" className="flex items-center gap-2 text-base font-medium text-ll-navy">
              Current year
              <span className="text-xs text-zinc-500">(optional)</span>
            </label>
            <select
              id="year"
              name="year"
              value={draft.year}
              onChange={(event) => setDraft((prev) => ({ ...prev, year: event.target.value }))}
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-base"
            >
              <option value="">Select a year</option>
              <option value="freshman">Freshman</option>
              <option value="sophomore">Sophomore</option>
              <option value="junior">Junior</option>
              <option value="senior">Senior</option>
              <option value="graduate">Graduate</option>
              <option value="other">Other</option>
            </select>
          </div>
          <TagField
            label="Major(s)"
            name="major"
            value={draft.major}
            onChange={setDraft}
            placeholder="Biology"
            hint="Type a value and press Enter or comma to add a tag. Click x to remove."
          />
          <TagField
            label="Minor(s)"
            name="minor"
            value={draft.minor}
            onChange={setDraft}
            placeholder="Chemistry"
            hint="Type a value and press Enter or comma to add a tag. Click x to remove."
          />
          <div className="grid gap-5 md:grid-cols-3">
            <div className="space-y-2">
              <label
                htmlFor="graduation_month"
                className="flex items-center gap-2 text-base font-medium text-ll-navy"
              >
                Graduation month
                <span className="text-xs text-zinc-500">(optional)</span>
              </label>
              <select
                id="graduation_month"
                name="graduation_month"
                value={draft.graduation_month}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, graduation_month: event.target.value }))
                }
                className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-base"
              >
                <option value="">Select a month</option>
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
            </div>
            <Field label="Graduation year" name="graduation_year" value={draft.graduation_year} onChange={setDraft} placeholder="2028" />
            <Field label="GPA" name="gpa" value={draft.gpa} onChange={setDraft} placeholder="3.7" />
          </div>
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
            hint="Type a value and press Enter or comma to add a tag. Click x to remove."
          />
          <TagField
            label="Research topics"
            name="research_topics"
            value={draft.research_topics}
            onChange={setDraft}
            placeholder="CRISPR"
            hint="Type a value and press Enter or comma to add a tag. Click x to remove."
          />
          <TagField
            label="Ranked top interests"
            name="ranked_interests"
            value={draft.ranked_interests}
            onChange={setDraft}
            placeholder="imaging"
            hint="Type a value and press Enter or comma to add a tag. Click x to remove."
          />
        </div>
      ) : null}

      {step === 4 ? (
        <div className="mt-6 grid gap-5">
          <TagField
            label="Skills"
            name="skills"
            value={draft.skills}
            onChange={setDraft}
            placeholder="PCR"
            required
            hint="Type a value and press Enter or comma to add a tag. Click x to remove."
          />
          <div className="space-y-2">
            <label htmlFor="prior_experience" className="flex items-center gap-2 text-base font-medium text-ll-navy">
              Prior experience
              <span className="text-xs text-zinc-500">(optional)</span>
            </label>
            <select
              id="prior_experience"
              name="prior_experience"
              value={splitValues(draft.prior_experience)[0] ?? ""}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, prior_experience: event.target.value }))
              }
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-base"
            >
              <option value="">Select one</option>
              <option value="none">No prior experience</option>
              <option value="research_lab">Research lab</option>
              <option value="hospital_volunteering">Hospital volunteering</option>
              <option value="shadowing">Physician shadowing</option>
              <option value="clinical_work">Clinical work</option>
              <option value="independent_project">Independent project</option>
            </select>
          </div>
          <TagField
            label="Programming languages"
            name="programming_languages"
            value={draft.programming_languages}
            onChange={setDraft}
            placeholder="Python"
            hint="Type a value and press Enter or comma to add a tag. Click x to remove."
          />
          <TagField
            label="Lab equipment"
            name="lab_equipment"
            value={draft.lab_equipment}
            onChange={setDraft}
            placeholder="Confocal microscope"
            hint="Type a value and press Enter or comma to add a tag. Click x to remove."
          />
          <TagField
            label="Software tools"
            name="software_tools"
            value={draft.software_tools}
            onChange={setDraft}
            placeholder="GraphPad"
            hint="Type a value and press Enter or comma to add a tag. Click x to remove."
          />
          <Field
            label="Experience details"
            name="experience_details"
            value={draft.experience_details}
            onChange={setDraft}
            placeholder="Research intern at X lab for 6 months..."
          />
          <TagField
            label="Relevant courses"
            name="relevant_courses"
            value={draft.relevant_courses}
            onChange={setDraft}
            placeholder="Biochemistry"
            hint="Type a value and press Enter or comma to add a tag. Click x to remove."
          />
        </div>
      ) : null}

      {step === 5 ? (
        <div className="mt-6 grid gap-5">
          <MultiSelectDropdown
            label="Role types sought"
            values={splitValues(draft.role_types_sought)}
            options={roleTypesSoughtOptions}
            onChange={(values) =>
              setDraft((prev) => ({ ...prev, role_types_sought: values.join(", ") }))
            }
            placeholder="Select role types"
          />
          <Field
            label="Start availability"
            name="start_availability"
            value={draft.start_availability}
            onChange={setDraft}
            placeholder="Summer 2026"
            hint="Examples: Immediately, Spring 2027."
          />
          <MultiSelectDropdown
            label="Experience types"
            values={splitValues(draft.experience_types)}
            options={experienceTypesOptions}
            onChange={(values) =>
              setDraft((prev) => ({ ...prev, experience_types: values.join(", ") }))
            }
            placeholder="Select experience types"
          />
          <MultiSelectDropdown
            label="Priorities"
            values={splitValues(draft.priorities)}
            options={prioritiesOptions}
            onChange={(values) => setDraft((prev) => ({ ...prev, priorities: values.join(", ") }))}
            placeholder="Select priorities"
          />
          <div className="space-y-2">
            <label htmlFor="willing_to_volunteer" className="flex items-center gap-2 text-base font-medium text-ll-navy">
              Willing to volunteer
              <span className="text-xs text-zinc-500">(optional)</span>
            </label>
            <select
              id="willing_to_volunteer"
              name="willing_to_volunteer"
              value={draft.willing_to_volunteer}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, willing_to_volunteer: event.target.value }))
              }
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-base"
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="is_gpa_visible" className="flex items-center gap-2 text-base font-medium text-ll-navy">
              GPA visible on profile
              <span className="text-xs text-zinc-500">(optional)</span>
            </label>
            <select
              id="is_gpa_visible"
              name="is_gpa_visible"
              value={draft.is_gpa_visible}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, is_gpa_visible: event.target.value }))
              }
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-base"
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>
      ) : null}

      {step === 6 ? (
        <div className="mt-6 grid gap-5">
          <Field
            label="Time commitment"
            name="time_commitment"
            value={draft.time_commitment}
            onChange={setDraft}
            placeholder="5"
            required
            hint="Expected hours per week."
          />
          <MultiSelectDropdown
            label="Paid preference"
            values={splitValues(draft.paid_preference)}
            options={paidPreferenceOptions}
            onChange={(values) =>
              setDraft((prev) => ({ ...prev, paid_preference: values.join(", ") }))
            }
            placeholder="Select paid preference"
          />
          <TagField
            label="Motivations"
            name="motivations"
            value={draft.motivations}
            onChange={setDraft}
            placeholder="med_school_prep"
            hint="Type a value and press Enter or comma to add a tag. Click x to remove."
          />
          <Field
            label="Honors or awards"
            name="honors_or_awards"
            value={draft.honors_or_awards}
            onChange={setDraft}
            placeholder="Dean's list, research award..."
          />
          <Field
            label="Publications"
            name="publications"
            value={draft.publications}
            onChange={setDraft}
            placeholder="Paper title, venue, year"
          />
          <SmallFileUpload label="Upload profile photo" inputId="avatar_file" name="avatar_file" accept=".png,.jpg,.jpeg,.webp" />
          <SmallFileUpload label="Upload resume file" inputId="resume_file" name="resume_file" accept=".pdf" />
          <SmallFileUpload label="Upload transcript file" inputId="transcript_file" name="transcript_file" accept=".pdf" />
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
              className="inline-flex items-center justify-center gap-2 rounded-full bg-ll-purple px-6 py-3 text-base font-medium text-white transition-all duration-250 hover:-translate-y-0.5 hover:bg-ll-purple/90 hover:shadow-md disabled:opacity-60"
            >
              Continue
              <ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
            </button>
          </div>
        ) : (
          <button
            type="submit"
            className="rounded-full bg-ll-purple px-6 py-3 text-base font-medium text-white transition-all duration-250 hover:-translate-y-0.5 hover:bg-ll-purple/90 hover:shadow-md"
          >
            Complete onboarding
          </button>
        )}
      </div>
    </form>
  );
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
  name: keyof StudentDraft;
  value: string;
  onChange: Dispatch<SetStateAction<StudentDraft>>;
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
        className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-base transition-all duration-200 hover:border-zinc-400 focus:border-ll-purple focus:outline-none focus:ring-2 focus:ring-ll-purple/20"
      />
      {hint ? <p className="text-sm text-ll-gray">{hint}</p> : null}
    </div>
  );
}

function splitValues(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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
  name: keyof StudentDraft;
  value: string;
  onChange: Dispatch<SetStateAction<StudentDraft>>;
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
        className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-base transition-all duration-200 hover:border-zinc-400 focus:border-ll-purple focus:outline-none focus:ring-2 focus:ring-ll-purple/20"
      />
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {tags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors duration-200 hover:border-zinc-400">
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
      {hint ? <p className="text-sm text-ll-gray">{hint}</p> : null}
    </div>
  );
}

function SmallFileUpload({
  label,
  inputId,
  name,
  accept,
}: {
  label: string;
  inputId: string;
  name: string;
  accept: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="flex items-center gap-2 text-base font-medium text-ll-navy">
        {label}
        <span className="text-xs text-zinc-500">(optional)</span>
      </label>
      <label
        htmlFor={inputId}
        className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 px-4 py-3 text-sm transition-all duration-200 hover:border-zinc-400 hover:bg-zinc-100"
      >
        <span className="inline-flex items-center gap-2 text-zinc-700">
          <Upload className="h-4 w-4" />
          Choose file
        </span>
        <span className="text-xs text-zinc-500">{accept}</span>
      </label>
      <input id={inputId} name={name} type="file" accept={accept} className="hidden" />
    </div>
  );
}
