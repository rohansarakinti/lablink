"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function toList(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function completeProfessorOnboarding(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  const university = String(formData.get("university") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const officeLocation = String(formData.get("office_location") ?? "").trim();
  const labWebsite = String(formData.get("lab_website") ?? "").trim();
  const cvUrl = String(formData.get("cv_url") ?? "").trim();
  const googleScholarUrl = String(formData.get("google_scholar_url") ?? "").trim();
  const orcid = String(formData.get("orcid") ?? "").trim();
  const researchFields = toList(formData.get("research_fields"));
  const researchKeywords = toList(formData.get("research_keywords"));
  const researchSummary = String(formData.get("research_summary") ?? "").trim();
  const preferredExperienceLevel = String(formData.get("preferred_experience_level") ?? "").trim();
  const mentorshipStyle = toList(formData.get("mentorship_style"));
  const labCulture = toList(formData.get("lab_culture"));
  const preferredStudentYear = toList(formData.get("preferred_student_year"));
  const preferredMajors = toList(formData.get("preferred_majors"));
  const profileVisibility = String(formData.get("profile_visibility") ?? "public").trim();
  const notifyNewApplications = String(formData.get("notify_new_applications") ?? "true");
  const notifyWeeklyDigest = String(formData.get("notify_weekly_digest") ?? "true");

  if (!fullName || !university) {
    redirect("/onboarding/professor?error=missing_fields");
  }

  await supabase.from("professor_profiles").upsert(
    {
      id: user.id,
      full_name: fullName,
      university,
      department: department || null,
      title: title || null,
      office_location: officeLocation || null,
      lab_website: labWebsite || null,
      cv_url: cvUrl || null,
      google_scholar_url: googleScholarUrl || null,
      orcid: orcid || null,
      research_fields: researchFields,
      research_keywords: researchKeywords,
      research_summary: researchSummary || null,
      preferred_experience_level: preferredExperienceLevel || null,
      mentorship_style: mentorshipStyle,
      lab_culture: labCulture,
      preferred_student_year: preferredStudentYear,
      preferred_majors: preferredMajors,
      profile_visibility: profileVisibility || "public",
      notify_new_applications: notifyNewApplications !== "false",
      notify_weekly_digest: notifyWeeklyDigest !== "false",
    },
    { onConflict: "id" },
  );

  await supabase
    .from("profiles")
    .update({ onboarding_complete: true, display_name: fullName })
    .eq("id", user.id);

  redirect("/dashboard/professor");
}
