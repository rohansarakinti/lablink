"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function uploadApplicationAsset(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  file: FormDataEntryValue | null,
) {
  if (!(file instanceof File) || file.size === 0) return null;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
  const filePath = `applications/${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("lab-assets").upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) return null;
  const { data } = supabase.storage.from("lab-assets").getPublicUrl(filePath);
  return data.publicUrl;
}

export async function submitApplication(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?role=student");
  }

  const postingId = String(formData.get("posting_id") ?? "").trim();
  if (!postingId) throw new Error("Missing posting id");

  const { data: gate } = await supabase
    .from("profiles")
    .select("role,onboarding_complete")
    .eq("id", user.id)
    .single<{ role: "student" | "professor"; onboarding_complete: boolean }>();

  if (!gate || gate.role !== "student") {
    redirect("/dashboard/professor");
  }

  if (!gate.onboarding_complete) {
    redirect("/onboarding/student");
  }

  const { data: studentProfile } = await supabase
    .from("student_profiles")
    .select("id,resume_url")
    .eq("id", user.id)
    .maybeSingle<{ id: string; resume_url: string | null }>();

  if (!studentProfile) {
    redirect("/dashboard/student?error=missing_student_profile");
  }

  const statement = String(formData.get("statement") ?? "").trim();
  const resumeSource = String(formData.get("resume_source") ?? "upload").trim();

  const uploadedResumeUrl = await uploadApplicationAsset(supabase, user.id, formData.get("resume_file"));
  const uploadedCoverLetterUrl = await uploadApplicationAsset(
    supabase,
    user.id,
    formData.get("cover_letter_file"),
  );

  const useProfileResume = resumeSource === "profile";
  const resumeUrl = uploadedResumeUrl || (useProfileResume ? studentProfile.resume_url : null);
  const coverLetterUrl = uploadedCoverLetterUrl || null;

  if (!resumeUrl) {
    redirect(`/postings/${postingId}?error=resume_required`);
  }

  const customResponses: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("custom_question_")) continue;
    const questionId = key.replace("custom_question_", "").trim();
    const response = String(value ?? "").trim();
    if (!questionId || !response) continue;
    customResponses[questionId] = response;
  }

  const { data: application, error } = await supabase
    .from("applications")
    .insert({
      posting_id: postingId,
      student_id: user.id,
      resume_url: resumeUrl,
      transcript_url: coverLetterUrl,
      statement: statement || null,
      custom_responses: customResponses,
      status: "submitted",
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !application) {
    const detail = encodeURIComponent(error.message);
    redirect(`/postings/${postingId}?error=submit_failed&detail=${detail}`);
  }

  const { data: postingMeta } = await supabase
    .from("role_postings")
    .select("id,title,lab_id,lab_groups(name)")
    .eq("id", postingId)
    .maybeSingle<{
      id: string;
      title: string;
      lab_id: string;
      lab_groups: { name: string } | null;
    }>();

  if (postingMeta) {
    const { data: managers } = await supabase
      .from("lab_memberships")
      .select("user_id")
      .eq("lab_id", postingMeta.lab_id)
      .eq("is_active", true)
      .in("lab_role", ["pi", "lab_manager"])
      .returns<Array<{ user_id: string }>>();

    const notificationRows = (managers ?? []).map((manager) => ({
      user_id: manager.user_id,
      type: "application_submitted",
      payload: {
        application_id: application.id,
        posting_id: postingMeta.id,
        posting_title: postingMeta.title,
        lab_id: postingMeta.lab_id,
        lab_name: postingMeta.lab_groups?.name ?? null,
        student_id: user.id,
      },
      read: false,
    }));

    if (notificationRows.length > 0) {
      // Best-effort: notifications table may not be migrated yet in some environments.
      await supabase.from("notifications").insert(notificationRows);
    }
  }

  revalidatePath("/dashboard/student");
  revalidatePath(`/postings/${postingId}`);
  redirect("/dashboard/student/applications?submitted=1");
}
