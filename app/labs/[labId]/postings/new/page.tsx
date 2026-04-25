import { redirect } from "next/navigation";
import { getLabContext } from "../../_lib";
import { createRolePosting } from "../../actions";

export default async function NewRolePostingPage({
  params,
}: {
  params: Promise<{ labId: string }>;
}) {
  const { labId } = await params;
  const context = await getLabContext(labId);

  if (!context.canManage) {
    redirect(`/labs/${labId}/postings`);
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-emerald-200/40 bg-white/95 shadow-lg shadow-teal-900/5">
      <div className="bg-gradient-to-r from-emerald-50/90 via-ll-bg/50 to-white px-6 py-6 md:px-8">
        <div className="h-1 w-14 rounded-full bg-gradient-to-r from-emerald-600 to-teal-500" aria-hidden />
        <h2 className="mt-3 text-2xl font-semibold text-ll-navy">Create role posting</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600">
          Define expectations, candidate filters, and publication status for this opportunity.
        </p>
      </div>

      <form action={createRolePosting} className="grid gap-4 border-t border-zinc-100 px-6 py-6 md:px-8">
        <input type="hidden" name="lab_id" value={labId} />

        <Field label="Title" name="title" required />

        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium text-ll-navy">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={6}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Describe what the student will do, who the lab is, and why to apply."
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="Role type"
            name="member_role"
            required
            options={[
              ["undergrad_ra", "Undergraduate RA"],
              ["grad_researcher", "Graduate RA"],
              ["lab_technician", "Lab technician"],
              ["volunteer", "Volunteer"],
              ["postdoc", "Postdoc"],
            ]}
          />
          <Select
            label="Paid preference"
            name="is_paid"
            options={[
              ["", "Not specified"],
              ["paid", "Paid"],
              ["unpaid", "Unpaid"],
              ["either", "Either"],
            ]}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Hourly rate range" name="hourly_rate_range" placeholder="15-20/hr" />
          <Select
            label="Hours/week"
            name="hours_per_week"
            options={[
              ["", "Not specified"],
              ["<5", "<5"],
              ["5-10", "5-10"],
              ["10-20", "10-20"],
              ["20+", "20+"],
            ]}
          />
          <Field label="Duration" name="duration" placeholder="One semester" />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Start date" name="start_date" placeholder="Summer 2026" />
          <Field label="Spots available" name="spots_available" type="number" />
          <Field label="Application deadline" name="application_deadline" type="date" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Required skills (comma-separated)" name="required_skills" placeholder="PCR, Python" />
          <Field label="Preferred skills (comma-separated)" name="preferred_skills" placeholder="R, microscopy" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Preferred year (comma-separated)"
            name="preferred_year"
            placeholder="junior, senior, graduate"
          />
          <Field
            label="Preferred majors (comma-separated)"
            name="preferred_majors"
            placeholder="Biology, Neuroscience"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Select
            label="Minimum experience"
            name="min_experience"
            options={[
              ["", "Not specified"],
              ["none", "None required"],
              ["intro_courses", "Intro courses"],
              ["prior_experience", "Prior experience"],
            ]}
          />
          <Field label="Minimum GPA" name="min_gpa" type="number" step="0.01" />
          <Select
            label="GPA enforcement"
            name="gpa_enforcement"
            options={[
              ["", "Not specified"],
              ["strict", "Strict"],
              ["preferred", "Preferred"],
              ["holistic", "Holistic"],
            ]}
          />
        </div>

        <Field
          label="Priority courses (comma-separated)"
          name="priority_courses"
          placeholder="Biochemistry, Statistics"
        />
        <Field
          label="Evaluation methods (comma-separated)"
          name="eval_methods"
          placeholder="resume, transcript, statement_of_interest, interview"
        />

        <div className="flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-4">
          <button
            type="submit"
            name="publish_now"
            value="false"
            className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-900 shadow-sm transition hover:bg-sky-100"
          >
            Save draft
          </button>
          <button
            type="submit"
            name="publish_now"
            value="true"
            className="rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-900/15 transition hover:brightness-105"
          >
            Publish now
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
  step,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  step?: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="text-sm font-medium text-ll-navy">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        step={step}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
      />
    </div>
  );
}

function Select({
  label,
  name,
  options,
  required,
}: {
  label: string;
  name: string;
  options: Array<[string, string]>;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="text-sm font-medium text-ll-navy">
        {label}
      </label>
      <select
        id={name}
        name={name}
        required={required}
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
      >
        {options.map(([value, text]) => (
          <option key={`${name}-${value || "empty"}`} value={value}>
            {text}
          </option>
        ))}
      </select>
    </div>
  );
}
