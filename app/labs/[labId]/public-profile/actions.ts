"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function toNullableText(value: FormDataEntryValue | null) {
  const out = String(value ?? "").trim();
  return out || null;
}

function toList(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function saveLabPublicProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?role=professor");
  }

  const labId = String(formData.get("lab_id") ?? "").trim();
  if (!labId) {
    redirect("/dashboard/professor");
  }

  const { data: membership } = await supabase
    .from("lab_memberships")
    .select("lab_role")
    .eq("lab_id", labId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle<{ lab_role: string }>();

  if (!membership || (membership.lab_role !== "pi" && membership.lab_role !== "lab_manager")) {
    redirect(`/labs/${labId}`);
  }

  const { data: existing } = await supabase
    .from("lab_groups")
    .select("banner_url,logo_url,gallery_urls")
    .eq("id", labId)
    .maybeSingle<{ banner_url: string | null; logo_url: string | null; gallery_urls: string[] }>();

  const bannerUrlFromForm = toNullableText(formData.get("banner_url"));
  const logoUrlFromForm = toNullableText(formData.get("logo_url"));
  const galleryUrls = formData
    .getAll("gallery_urls")
    .map((v) => String(v).trim())
    .filter(Boolean)
    .slice(0, 8);

  const basePayload = {
    tagline: toNullableText(formData.get("tagline")),
    description: toNullableText(formData.get("description")),
    website_url: toNullableText(formData.get("website_url")),
    banner_url: bannerUrlFromForm || existing?.banner_url || null,
    logo_url: logoUrlFromForm || existing?.logo_url || null,
    research_fields: toList(formData.get("research_fields")),
    research_tags: toList(formData.get("research_tags")),
  };
  const fullPayload: Record<string, string | string[] | null> = {
    ...basePayload,
    student_fit: toNullableText(formData.get("student_fit")),
    expectations: toNullableText(formData.get("expectations")),
    gallery_urls: galleryUrls,
  };
  let payload: Record<string, string | string[] | null> = { ...fullPayload };
  let lastError: { message: string } | null = null;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { error } = await supabase.from("lab_groups").update(payload).eq("id", labId);
    if (!error) {
      lastError = null;
      break;
    }

    lastError = { message: error.message };
    const missingExpectations = error.message.includes("'expectations'");
    const missingStudentFit = error.message.includes("'student_fit'");
    const missingGalleryUrls = error.message.includes("'gallery_urls'");

    if (missingExpectations) {
      delete payload.expectations;
      continue;
    }
    if (missingStudentFit) {
      delete payload.student_fit;
      continue;
    }
    if (missingGalleryUrls) {
      delete payload.gallery_urls;
      continue;
    }
    break;
  }

  if (lastError) {
    redirect(`/labs/${labId}/public-profile?error=${encodeURIComponent(lastError.message)}`);
  }
  revalidatePath(`/labs/${labId}`);
  revalidatePath(`/labs/${labId}/public-profile`);
  revalidatePath(`/dashboard/student/lab/${labId}`);
  redirect(`/labs/${labId}/public-profile?saved=1`);
}
