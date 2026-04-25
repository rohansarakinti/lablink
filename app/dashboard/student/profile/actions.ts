"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function toList(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toNullableText(value: FormDataEntryValue | null) {
  const out = String(value ?? "").trim();
  return out || null;
}

function toNullableSmallInt(value: FormDataEntryValue | null) {
  const parsed = Number(value ?? "");
  if (!Number.isFinite(parsed)) return null;
  if (!Number.isInteger(parsed)) return null;
  if (parsed < -32768 || parsed > 32767) return null;
  return parsed;
}

function toNullableNumeric(value: FormDataEntryValue | null) {
  const parsed = Number(value ?? "");
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

async function uploadProfileAsset(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  file: FormDataEntryValue | null,
  bucketPathPrefix: string,
  preserveOriginalName = false,
) {
  if (!(file instanceof File) || file.size === 0) return null;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
  const safeBaseName = file.name
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "file";
  const fileName = preserveOriginalName
    ? `${safeBaseName}.${extension}`
    : `${crypto.randomUUID()}.${extension}`;
  const filePath = `${bucketPathPrefix}/${userId}/${fileName}`;
  const { error } = await supabase.storage.from("lab-assets").upload(filePath, file, {
    cacheControl: "3600",
    upsert: preserveOriginalName,
    contentType: file.type || undefined,
  });
  if (error) return null;
  const { data } = supabase.storage.from("lab-assets").getPublicUrl(filePath);
  return data.publicUrl;
}

export async function saveStudentProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?role=student");
  }

  const { data: gate } = await supabase
    .from("profiles")
    .select("role,avatar_url")
    .eq("id", user.id)
    .maybeSingle<{ role: "student" | "professor"; avatar_url: string | null }>();

  if (!gate || gate.role !== "student") {
    redirect("/dashboard/professor");
  }

  const avatarUrlFromForm = toNullableText(formData.get("avatar_url"));
  const uploadedResumeUrl = await uploadProfileAsset(
    supabase,
    user.id,
    formData.get("resume_file"),
    "student-profiles",
    true,
  );
  const uploadedTranscriptUrl = await uploadProfileAsset(
    supabase,
    user.id,
    formData.get("transcript_file"),
    "student-profiles",
  );

  const existingProfile = await supabase
    .from("student_profiles")
    .select("resume_url,transcript_url")
    .eq("id", user.id)
    .maybeSingle<{ resume_url: string | null; transcript_url: string | null }>();

  const resumeUrl = uploadedResumeUrl || existingProfile.data?.resume_url || null;
  const transcriptUrl =
    uploadedTranscriptUrl || existingProfile.data?.transcript_url || null;

  const studentPayload = {
    id: user.id,
    full_name: toNullableText(formData.get("full_name")),
    university: toNullableText(formData.get("university")),
    major: toList(formData.get("major")),
    minor: toList(formData.get("minor")),
    year: toNullableText(formData.get("year")),
    graduation_month: toNullableSmallInt(formData.get("graduation_month")),
    graduation_year: toNullableSmallInt(formData.get("graduation_year")),
    gpa: toNullableNumeric(formData.get("gpa")),
    is_gpa_visible: String(formData.get("is_gpa_visible") ?? "true") !== "false",
    research_fields: toList(formData.get("research_fields")),
    research_topics: toList(formData.get("research_topics")),
    ranked_interests: toList(formData.get("ranked_interests")),
    skills: toList(formData.get("skills")),
    programming_languages: toList(formData.get("programming_languages")),
    lab_equipment: toList(formData.get("lab_equipment")),
    software_tools: toList(formData.get("software_tools")),
    prior_experience: toList(formData.get("prior_experience")),
    experience_details: toNullableText(formData.get("experience_details")),
    transcript_url: transcriptUrl,
    resume_url: resumeUrl,
    experience_types: toList(formData.get("experience_types")),
    priorities: toList(formData.get("priorities")),
    relevant_courses: toList(formData.get("relevant_courses")),
    role_types_sought: toList(formData.get("role_types_sought")),
    time_commitment: toNullableText(formData.get("time_commitment")),
    paid_preference: toNullableText(formData.get("paid_preference")),
    motivations: toList(formData.get("motivations")),
    start_availability: toNullableText(formData.get("start_availability")),
    honors_or_awards: toNullableText(formData.get("honors_or_awards")),
    publications: toNullableText(formData.get("publications")),
    willing_to_volunteer: String(formData.get("willing_to_volunteer") ?? "true") !== "false",
  };

  await supabase.from("student_profiles").upsert(studentPayload, { onConflict: "id" });

  await supabase
    .from("profiles")
    .update({
      display_name: toNullableText(formData.get("display_name")),
      avatar_url: avatarUrlFromForm || gate.avatar_url || null,
      email: toNullableText(formData.get("email")),
    })
    .eq("id", user.id);

  revalidatePath("/dashboard/student/profile");
  redirect("/dashboard/student/profile?saved=1");
}
