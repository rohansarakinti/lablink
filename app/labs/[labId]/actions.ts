"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const memberRoles = [
  "pi",
  "lab_manager",
  "postdoc",
  "grad_researcher",
  "undergrad_ra",
  "lab_technician",
  "volunteer",
] as const;

const postingStatuses = ["draft", "open", "closed", "archived"] as const;
const postingMemberRoles = [
  "undergrad_ra",
  "grad_researcher",
  "postdoc",
  "lab_technician",
  "volunteer",
] as const;
const applicationStatuses = ["submitted", "reviewing", "interview", "accepted", "rejected", "withdrawn"] as const;

async function ensureManager(labId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: membership } = await supabase
    .from("lab_memberships")
    .select("lab_role")
    .eq("lab_id", labId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle<{ lab_role: string }>();

  if (!membership || (membership.lab_role !== "pi" && membership.lab_role !== "lab_manager")) {
    throw new Error("Not authorized");
  }

  return { supabase, actorId: user.id, actorRole: membership.lab_role };
}

export async function changeMemberRole(formData: FormData) {
  const labId = String(formData.get("lab_id") ?? "");
  const membershipId = String(formData.get("membership_id") ?? "");
  const nextRole = String(formData.get("next_role") ?? "");

  if (!memberRoles.includes(nextRole as (typeof memberRoles)[number])) {
    throw new Error("Invalid role");
  }

  const { supabase, actorId, actorRole } = await ensureManager(labId);

  const { data: target } = await supabase
    .from("lab_memberships")
    .select("user_id,lab_role")
    .eq("id", membershipId)
    .eq("lab_id", labId)
    .maybeSingle<{ user_id: string; lab_role: string }>();

  if (!target) throw new Error("Member not found");
  if (target.user_id === actorId && actorRole === "pi") throw new Error("PI role cannot be self-changed");
  if (target.lab_role === "pi" && actorRole !== "pi") throw new Error("Only PI can edit PI role");

  await supabase.from("lab_memberships").update({ lab_role: nextRole }).eq("id", membershipId).eq("lab_id", labId);

  revalidatePath(`/labs/${labId}/members`);
  revalidatePath(`/labs/${labId}`);
}

export async function removeMember(formData: FormData) {
  const labId = String(formData.get("lab_id") ?? "");
  const membershipId = String(formData.get("membership_id") ?? "");
  const { supabase, actorId, actorRole } = await ensureManager(labId);

  const { data: target } = await supabase
    .from("lab_memberships")
    .select("user_id,lab_role")
    .eq("id", membershipId)
    .eq("lab_id", labId)
    .maybeSingle<{ user_id: string; lab_role: string }>();

  if (!target) throw new Error("Member not found");
  if (target.user_id === actorId) throw new Error("Cannot remove yourself");
  if (target.lab_role === "pi" && actorRole !== "pi") throw new Error("Only PI can remove PI");

  await supabase.from("lab_memberships").update({ is_active: false }).eq("id", membershipId).eq("lab_id", labId);

  revalidatePath(`/labs/${labId}/members`);
  revalidatePath(`/labs/${labId}`);
}

export async function updatePostingStatus(formData: FormData) {
  const labId = String(formData.get("lab_id") ?? "");
  const postingId = String(formData.get("posting_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!postingStatuses.includes(status as (typeof postingStatuses)[number])) {
    throw new Error("Invalid status");
  }
  const { supabase } = await ensureManager(labId);

  await supabase.from("role_postings").update({ status }).eq("id", postingId).eq("lab_id", labId);
  revalidatePath(`/labs/${labId}/postings`);
  revalidatePath(`/labs/${labId}`);
}

export async function createInviteLink(formData: FormData) {
  const labId = String(formData.get("lab_id") ?? "");
  const inviteRole = String(formData.get("invite_role") ?? "lab_manager");
  if (!memberRoles.includes(inviteRole as (typeof memberRoles)[number])) {
    throw new Error("Invalid invite role");
  }
  await ensureManager(labId);

  const token = crypto.randomUUID();
  // Placeholder tokenized link until invite table/email flow is added.
  const inviteLink = `/auth/sign-up?lab_invite=${encodeURIComponent(token)}&lab_id=${encodeURIComponent(labId)}&lab_role=${encodeURIComponent(inviteRole)}`;
  redirect(`/labs/${labId}/members?invite_link=${encodeURIComponent(inviteLink)}`);
}

function toList(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function createRolePosting(formData: FormData) {
  const labId = String(formData.get("lab_id") ?? "");
  const { supabase, actorId } = await ensureManager(labId);

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const memberRole = String(formData.get("member_role") ?? "");
  const publishNow = String(formData.get("publish_now") ?? "false") === "true";
  const status = publishNow ? "open" : "draft";

  if (!title) throw new Error("Title required");
  if (!postingMemberRoles.includes(memberRole as (typeof postingMemberRoles)[number])) {
    throw new Error("Invalid posting member role");
  }

  const isPaid = String(formData.get("is_paid") ?? "").trim() || null;
  const hoursPerWeek = String(formData.get("hours_per_week") ?? "").trim() || null;
  const duration = String(formData.get("duration") ?? "").trim() || null;
  const startDate = String(formData.get("start_date") ?? "").trim() || null;
  const hourlyRateRange = String(formData.get("hourly_rate_range") ?? "").trim() || null;
  const minExperience = String(formData.get("min_experience") ?? "").trim() || null;
  const gpaEnforcement = String(formData.get("gpa_enforcement") ?? "").trim() || null;
  const minGpaRaw = String(formData.get("min_gpa") ?? "").trim();
  const minGpa = minGpaRaw ? Number(minGpaRaw) : null;
  const spotsRaw = String(formData.get("spots_available") ?? "").trim();
  const spotsAvailable = spotsRaw ? Number(spotsRaw) : null;
  const applicationDeadline = String(formData.get("application_deadline") ?? "").trim() || null;

  const { error } = await supabase.from("role_postings").insert({
    lab_id: labId,
    created_by: actorId,
    title,
    description: description || null,
    status,
    member_role: memberRole,
    is_paid: isPaid,
    hourly_rate_range: hourlyRateRange,
    hours_per_week: hoursPerWeek,
    duration,
    start_date: startDate,
    spots_available: spotsAvailable,
    application_deadline: applicationDeadline,
    required_skills: toList(formData.get("required_skills")),
    preferred_skills: toList(formData.get("preferred_skills")),
    preferred_year: toList(formData.get("preferred_year")),
    preferred_majors: toList(formData.get("preferred_majors")),
    min_experience: minExperience,
    min_gpa: minGpa,
    gpa_enforcement: gpaEnforcement,
    priority_courses: toList(formData.get("priority_courses")),
    eval_methods: toList(formData.get("eval_methods")),
    custom_questions: [],
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/labs/${labId}/postings`);
  revalidatePath(`/labs/${labId}`);
  redirect(`/labs/${labId}/postings`);
}

export async function updateApplicationStatus(formData: FormData) {
  const labId = String(formData.get("lab_id") ?? "");
  const postingId = String(formData.get("posting_id") ?? "");
  const applicationId = String(formData.get("application_id") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!applicationStatuses.includes(status as (typeof applicationStatuses)[number])) {
    throw new Error("Invalid application status");
  }

  const { supabase } = await ensureManager(labId);

  const { error } = await supabase
    .from("applications")
    .update({ status })
    .eq("id", applicationId)
    .eq("posting_id", postingId);

  if (error) throw new Error(error.message);

  revalidatePath(`/labs/${labId}/postings/${postingId}/applicants`);
  revalidatePath(`/labs/${labId}/applicants`);
}

export async function updateApplicationReviewerNotes(formData: FormData) {
  const labId = String(formData.get("lab_id") ?? "");
  const postingId = String(formData.get("posting_id") ?? "");
  const applicationId = String(formData.get("application_id") ?? "");
  const reviewerNotes = String(formData.get("reviewer_notes") ?? "").trim();

  const { supabase } = await ensureManager(labId);

  const { error } = await supabase
    .from("applications")
    .update({ reviewer_notes: reviewerNotes || null })
    .eq("id", applicationId)
    .eq("posting_id", postingId);

  if (error) throw new Error(error.message);

  revalidatePath(`/labs/${labId}/postings/${postingId}/applicants`);
}

export async function bulkUpdateApplicationStatus(formData: FormData) {
  const labId = String(formData.get("lab_id") ?? "");
  const postingId = String(formData.get("posting_id") ?? "");
  const status = String(formData.get("status") ?? "");
  const applicationIds = formData
    .getAll("application_ids")
    .map((value) => String(value))
    .filter(Boolean);

  if (!applicationStatuses.includes(status as (typeof applicationStatuses)[number])) {
    throw new Error("Invalid application status");
  }
  if (applicationIds.length === 0) {
    throw new Error("No applications selected");
  }

  const { supabase } = await ensureManager(labId);

  const { error } = await supabase
    .from("applications")
    .update({ status })
    .eq("posting_id", postingId)
    .in("id", applicationIds);

  if (error) throw new Error(error.message);

  revalidatePath(`/labs/${labId}/postings/${postingId}/applicants`);
  revalidatePath(`/labs/${labId}/applicants`);
}
