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

async function uploadLabAsset(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  labId: string,
  file: FormDataEntryValue | null,
  kind: "banner" | "logo" | "gallery",
) {
  if (!(file instanceof File) || file.size === 0) return null;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const filePath = `${userId}/lab-${kind}/${labId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("lab-assets").upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) return null;
  const { data } = supabase.storage.from("lab-assets").getPublicUrl(filePath);
  return data.publicUrl;
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

  const uploadedBanner = await uploadLabAsset(supabase, user.id, labId, formData.get("banner_file"), "banner");
  const uploadedLogo = await uploadLabAsset(supabase, user.id, labId, formData.get("logo_file"), "logo");

  const galleryUploads = await Promise.all(
    formData.getAll("gallery_files").map((entry) => uploadLabAsset(supabase, user.id, labId, entry, "gallery")),
  );
  const freshGallery = galleryUploads.filter((url): url is string => Boolean(url));
  const existingGallery = Array.isArray(existing?.gallery_urls) ? existing.gallery_urls : [];
  const preserveExistingGallery = String(formData.get("preserve_existing_gallery") ?? "true") !== "false";
  const galleryUrls = (preserveExistingGallery ? [...existingGallery, ...freshGallery] : freshGallery).slice(0, 8);

  await supabase
    .from("lab_groups")
    .update({
      tagline: toNullableText(formData.get("tagline")),
      description: toNullableText(formData.get("description")),
      website_url: toNullableText(formData.get("website_url")),
      banner_url: uploadedBanner || existing?.banner_url || null,
      logo_url: uploadedLogo || existing?.logo_url || null,
      research_fields: toList(formData.get("research_fields")),
      research_tags: toList(formData.get("research_tags")),
      student_fit: toNullableText(formData.get("student_fit")),
      expectations: toNullableText(formData.get("expectations")),
      gallery_urls: galleryUrls,
    })
    .eq("id", labId);

  revalidatePath(`/labs/${labId}`);
  revalidatePath(`/labs/${labId}/public-profile`);
  revalidatePath(`/dashboard/student/lab/${labId}`);
  redirect(`/labs/${labId}/public-profile?saved=1`);
}
