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

async function uploadProfileAsset(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  file: FormDataEntryValue | null,
  bucketPathPrefix: string,
) {
  if (!(file instanceof File) || file.size === 0) return null;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
  const filePath = `${bucketPathPrefix}/${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("lab-assets").upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) return null;
  const { data } = supabase.storage.from("lab-assets").getPublicUrl(filePath);
  return data.publicUrl;
}

export async function saveProfessorProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?role=professor");
  }

  const { data: gate } = await supabase
    .from("profiles")
    .select("role,avatar_url")
    .eq("id", user.id)
    .maybeSingle<{ role: "student" | "professor"; avatar_url: string | null }>();

  if (!gate || gate.role !== "professor") {
    redirect("/dashboard/student");
  }

  const avatarUrlFromForm = toNullableText(formData.get("avatar_url"));
  const uploadedCvUrl = await uploadProfileAsset(
    supabase,
    user.id,
    formData.get("cv_file"),
    "professor-profiles",
  );

  const { data: existingProfile } = await supabase
    .from("professor_profiles")
    .select("cv_url")
    .eq("id", user.id)
    .maybeSingle<{ cv_url: string | null }>();

  const cvUrl = uploadedCvUrl || existingProfile?.cv_url || null;

  const profileVisibility = String(formData.get("profile_visibility") ?? "public").trim();
  const visibility =
    profileVisibility === "university_only" || profileVisibility === "public" ? profileVisibility : "public";

  const profPayload = {
    id: user.id,
    full_name: toNullableText(formData.get("full_name")),
    title: toNullableText(formData.get("title")),
    university: toNullableText(formData.get("university")),
    department: toNullableText(formData.get("department")),
    office_location: toNullableText(formData.get("office_location")),
    lab_website: toNullableText(formData.get("lab_website")),
    cv_url: cvUrl,
    google_scholar_url: toNullableText(formData.get("google_scholar_url")),
    orcid: toNullableText(formData.get("orcid")),
    research_fields: toList(formData.get("research_fields")),
    research_keywords: toList(formData.get("research_keywords")),
    research_summary: toNullableText(formData.get("research_summary")),
    preferred_student_year: toList(formData.get("preferred_student_year")),
    preferred_majors: toList(formData.get("preferred_majors")),
    preferred_experience_level: toNullableText(formData.get("preferred_experience_level")),
    mentorship_style: toList(formData.get("mentorship_style")),
    lab_culture: toList(formData.get("lab_culture")),
    profile_visibility: visibility,
    notify_new_applications: String(formData.get("notify_new_applications") ?? "true") !== "false",
    notify_weekly_digest: String(formData.get("notify_weekly_digest") ?? "true") !== "false",
  };

  await supabase.from("professor_profiles").upsert(profPayload, { onConflict: "id" });

  await supabase
    .from("profiles")
    .update({
      display_name: toNullableText(formData.get("display_name")),
      avatar_url: avatarUrlFromForm || gate.avatar_url || null,
      email: toNullableText(formData.get("email")),
    })
    .eq("id", user.id);

  revalidatePath("/dashboard/professor/profile");
  redirect("/dashboard/professor/profile?saved=1");
}
