"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requestEmbeddingRefresh } from "@/lib/embeddings";
import { canPostToLabFeed } from "../_lib";

const MAX_CAPTION = 8000;
const MAX_IMAGES = 8;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export type LabFeedMediaItem = { url: string; type: string; alt?: string };

export type CreateLabFeedPostResult = { ok: true } | { ok: false; error: string };

export async function createLabFeedPost(input: {
  labId: string;
  caption: string;
  media: LabFeedMediaItem[];
  tags?: string[];
}): Promise<CreateLabFeedPostResult> {
  const { labId, caption, media, tags = [] } = input;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { data: membership } = await supabase
    .from("lab_memberships")
    .select("lab_role")
    .eq("lab_id", labId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle<{ lab_role: string }>();

  if (!membership || !canPostToLabFeed(membership.lab_role)) {
    return { ok: false, error: "You cannot publish to this lab feed." };
  }

  const cap = caption.trim();
  if (!cap) return { ok: false, error: "Add a description for your post." };
  if (cap.length > MAX_CAPTION) return { ok: false, error: "Description is too long." };
  if (media.length === 0) return { ok: false, error: "Add at least one image." };
  if (media.length > MAX_IMAGES) return { ok: false, error: `You can attach at most ${MAX_IMAGES} images.` };

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
  for (const m of media) {
    if (!m.url.startsWith("http")) return { ok: false, error: "Invalid image URL." };
    if (base && !m.url.startsWith(base)) return { ok: false, error: "Images must be uploaded to this site." };
    if (!m.url.includes("/object/public/post-media/")) return { ok: false, error: "Invalid image storage path." };
    if (!allowedImageTypes.has(m.type)) return { ok: false, error: "Only JPEG, PNG, WebP, or GIF images are allowed." };
  }

  const { data: inserted, error } = await supabase
    .from("lab_posts")
    .insert({
      lab_id: labId,
      author_id: user.id,
      caption: cap,
      media,
      tags,
      is_published: true,
    })
    .select("*")
    .single<Record<string, unknown>>();

  if (error) return { ok: false, error: error.message };
  if (inserted) await requestEmbeddingRefresh("lab_posts", inserted);

  revalidatePath(`/labs/${labId}/feed`);
  revalidatePath(`/labs/${labId}`);
  return { ok: true };
}
