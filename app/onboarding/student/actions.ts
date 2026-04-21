"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requestEmbeddingRefresh } from "@/lib/embeddings";

function toList(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function completeStudentOnboarding(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  const university = String(formData.get("university") ?? "").trim();
  const year = String(formData.get("year") ?? "").trim();
  const major = toList(formData.get("major"));
  const minor = toList(formData.get("minor"));
  const researchFields = toList(formData.get("research_fields"));
  const researchTopics = toList(formData.get("research_topics"));
  const rankedInterests = toList(formData.get("ranked_interests"));
  const skills = toList(formData.get("skills"));
  const programmingLanguages = toList(formData.get("programming_languages"));
  const labEquipment = toList(formData.get("lab_equipment"));
  const softwareTools = toList(formData.get("software_tools"));
  const priorExperience = toList(formData.get("prior_experience"));
  const experienceDetails = String(formData.get("experience_details") ?? "").trim();
  const transcriptUrl = String(formData.get("transcript_url") ?? "").trim();
  const resumeUrl = String(formData.get("resume_url") ?? "").trim();
  const relevantCourses = toList(formData.get("relevant_courses"));
  const roleTypesSought = toList(formData.get("role_types_sought"));
  const timeCommitment = String(formData.get("time_commitment") ?? "").trim();
  const paidPreference = String(formData.get("paid_preference") ?? "").trim();
  const experienceTypes = toList(formData.get("experience_types"));
  const motivations = toList(formData.get("motivations"));
  const priorities = toList(formData.get("priorities"));
  const startAvailability = String(formData.get("start_availability") ?? "").trim();
  const honorsOrAwards = String(formData.get("honors_or_awards") ?? "").trim();
  const publications = String(formData.get("publications") ?? "").trim();
  const graduationMonthRaw = Number(formData.get("graduation_month") ?? 0);
  const graduationYearRaw = Number(formData.get("graduation_year") ?? 0);
  const gpaRaw = Number(formData.get("gpa") ?? 0);
  const parsedGpaRaw = Number(formData.get("parsed_gpa") ?? 0);
  const parsedCourses = String(formData.get("parsed_courses") ?? "").trim();
  const isGpaVisibleRaw = String(formData.get("is_gpa_visible") ?? "true");
  const volunteerRaw = String(formData.get("willing_to_volunteer") ?? "true");

  if (!fullName || !university) {
    redirect("/onboarding/student?error=missing_fields");
  }

  const studentPayload = {
    id: user.id,
    full_name: fullName,
    university,
    year: year || null,
    graduation_month:
      graduationMonthRaw >= 1 && graduationMonthRaw <= 12 ? graduationMonthRaw : null,
    graduation_year: graduationYearRaw > 0 ? graduationYearRaw : null,
    gpa: gpaRaw > 0 ? gpaRaw : null,
    major,
    minor,
    research_fields: researchFields,
    research_topics: researchTopics,
    ranked_interests: rankedInterests,
    skills,
    programming_languages: programmingLanguages,
    lab_equipment: labEquipment,
    software_tools: softwareTools,
    prior_experience: priorExperience,
    experience_details: experienceDetails || null,
    transcript_url: transcriptUrl || null,
    resume_url: resumeUrl || null,
    experience_types: experienceTypes,
    priorities,
    relevant_courses: relevantCourses,
    honors_or_awards: honorsOrAwards || null,
    publications: publications || null,
    role_types_sought: roleTypesSought,
    time_commitment: timeCommitment || null,
    paid_preference: paidPreference || null,
    motivations,
    start_availability: startAvailability || null,
    parsed_gpa: parsedGpaRaw > 0 ? parsedGpaRaw : null,
    parsed_courses: parsedCourses || null,
    is_gpa_visible: isGpaVisibleRaw !== "false",
    willing_to_volunteer: volunteerRaw !== "false",
  };

  await supabase.from("student_profiles").upsert(studentPayload, { onConflict: "id" });
  await requestEmbeddingRefresh("student_profiles", studentPayload);

  await supabase
    .from("profiles")
    .update({ onboarding_complete: true, display_name: fullName })
    .eq("id", user.id);

  redirect("/dashboard/student");
}
