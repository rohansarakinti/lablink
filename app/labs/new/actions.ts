"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function toList(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function uploadAsset(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  file: FormDataEntryValue | null,
) {
  if (!(file instanceof File) || file.size === 0) return null;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const filePath = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("lab-assets").upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) return null;
  const { data } = supabase.storage.from("lab-assets").getPublicUrl(filePath);
  return data.publicUrl;
}

export async function createLab(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in");

  const name = String(formData.get("name") ?? "").trim();
  const providedSlug = String(formData.get("slug") ?? "").trim();
  const university = String(formData.get("university") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim();
  const tagline = String(formData.get("tagline") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const websiteUrl = String(formData.get("website_url") ?? "").trim();
  const researchFields = toList(formData.get("research_fields"));
  const researchTags = toList(formData.get("research_tags"));
  const labEnvironment = toList(formData.get("lab_environment"));
  const requiresPostingApproval = String(formData.get("requires_posting_approval")) === "on";

  if (!name || !university || researchFields.length === 0) {
    redirect("/labs/new?error=missing_required");
  }

  const baseSlug = toSlug(providedSlug || name);
  if (!baseSlug) {
    redirect("/labs/new?error=invalid_slug");
  }

  let slug = baseSlug;
  for (let index = 1; index <= 5; index += 1) {
    const { data: existing } = await supabase
      .from("lab_groups")
      .select("id")
      .eq("slug", slug)
      .maybeSingle<{ id: string }>();
    if (!existing) break;
    slug = `${baseSlug}-${index + 1}`;
  }

  const logoUrl = await uploadAsset(supabase, user.id, formData.get("logo"));
  const bannerUrl = await uploadAsset(supabase, user.id, formData.get("banner"));

  const { data: lab, error: labError } = await supabase
    .from("lab_groups")
    .insert({
      slug,
      name,
      university,
      department: department || null,
      tagline: tagline || null,
      description: description || null,
      website_url: websiteUrl || null,
      logo_url: logoUrl,
      banner_url: bannerUrl,
      research_fields: researchFields,
      research_tags: researchTags,
      lab_environment: labEnvironment,
      requires_posting_approval: requiresPostingApproval,
      created_by: user.id,
    })
    .select("id")
    .single<{ id: string }>();

  if (labError || !lab) {
    const detail = encodeURIComponent(labError?.message ?? "Unknown error creating lab");
    redirect(`/labs/new?error=create_failed&detail=${detail}`);
  }

  const { error: memberError } = await supabase.from("lab_memberships").insert({
    lab_id: lab.id,
    user_id: user.id,
    lab_role: "pi",
    is_active: true,
  });

  if (memberError) {
    const detail = encodeURIComponent(memberError.message);
    redirect(`/labs/new?error=membership_failed&detail=${detail}`);
  }

  redirect("/dashboard/professor?created=1");
}
