"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updateLabFeedPost, type LabFeedMediaItem } from "@/app/labs/[labId]/feed/actions";

const MAX_CAPTION = 8000;
const MAX_IMAGES = 8;
const allowedMime = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const maxBytes = 5 * 1024 * 1024;

type PendingFile = { id: string; file: File; previewUrl: string };

export function LabFeedEditor({
  labId,
  postId,
  userId,
  initialCaption,
  initialMedia,
}: {
  labId: string;
  postId: string;
  userId: string;
  initialCaption: string;
  initialMedia: LabFeedMediaItem[];
}) {
  const router = useRouter();
  const [caption, setCaption] = useState(initialCaption);
  const [existingMedia, setExistingMedia] = useState<LabFeedMediaItem[]>(initialMedia);
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onPickFiles = (list: FileList | null) => {
    if (!list?.length) return;
    setError(null);
    const next: PendingFile[] = [];
    for (const file of Array.from(list)) {
      if (existingMedia.length + pending.length + next.length >= MAX_IMAGES) {
        setError(`You can attach at most ${MAX_IMAGES} images.`);
        break;
      }
      if (!allowedMime.has(file.type)) {
        setError("Use JPEG, PNG, WebP, or GIF images only.");
        continue;
      }
      if (file.size > maxBytes) {
        setError("Each image must be 5 MB or smaller.");
        continue;
      }
      next.push({ id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file) });
    }
    if (next.length) setPending((prev) => [...prev, ...next]);
  };

  const removeExistingAt = (index: number) => {
    setExistingMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const removePendingAt = (index: number) => {
    setPending((prev) => {
      const row = prev[index];
      if (row) URL.revokeObjectURL(row.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!caption.trim()) {
      setError("Write a description for your post.");
      return;
    }
    if (existingMedia.length + pending.length === 0) {
      setError("Add at least one image.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const uploaded: LabFeedMediaItem[] = [];
      for (const row of pending) {
        const ext = row.file.name.split(".").pop()?.toLowerCase();
        const safeExt = ext && /^[a-z0-9]+$/i.test(ext) ? ext : "jpg";
        const path = `${labId}/${userId}/${crypto.randomUUID()}.${safeExt}`;
        const { error: upErr } = await supabase.storage.from("post-media").upload(path, row.file, {
          cacheControl: "3600",
          upsert: false,
          contentType: row.file.type || undefined,
        });
        if (upErr) {
          setError(upErr.message);
          setSubmitting(false);
          return;
        }
        const { data } = supabase.storage.from("post-media").getPublicUrl(path);
        uploaded.push({ url: data.publicUrl, type: row.file.type });
      }

      const result = await updateLabFeedPost({
        labId,
        postId,
        caption: caption.trim(),
        media: [...existingMedia, ...uploaded],
      });
      if (!result.ok) {
        setError(result.error);
        setSubmitting(false);
        return;
      }
      pending.forEach((row) => URL.revokeObjectURL(row.previewUrl));
      router.push(`/labs/${labId}/feed`);
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-ll-navy">Edit post</h2>
      <p className="mt-1 text-sm text-zinc-600">Update caption and images.</p>

      <label htmlFor="edit-feed-caption" className="mt-5 block text-sm font-medium text-ll-navy">
        Description
      </label>
      <textarea
        id="edit-feed-caption"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        rows={6}
        maxLength={MAX_CAPTION}
        className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-ll-navy/20 focus:border-ll-navy focus:ring-2"
        disabled={submitting}
      />
      <p className="mt-1 text-xs text-zinc-500">{caption.length}/{MAX_CAPTION}</p>

      <div className="mt-5">
        <p className="text-sm font-medium text-ll-navy">Images</p>
        <p className="mt-0.5 text-xs text-zinc-500">Up to {MAX_IMAGES} images total. Remove existing or upload new ones.</p>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="mt-2 block w-full text-sm text-zinc-600 file:mr-3 file:rounded-full file:border-0 file:bg-ll-navy file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-ll-navy/90"
          disabled={submitting}
          onChange={(e) => {
            onPickFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {existingMedia.length > 0 ? (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Current images</p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {existingMedia.map((item, i) => (
              <li key={`${item.url}-${i}`} className="relative aspect-square overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
                {/* eslint-disable-next-line @next/next/no-img-element -- direct public storage URL preview */}
                <img src={item.url} alt={item.alt ?? ""} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeExistingAt(i)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white hover:bg-black/80"
                  disabled={submitting}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {pending.length > 0 ? (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">New uploads</p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {pending.map((row, i) => (
              <li key={row.id} className="relative aspect-square overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
                {/* eslint-disable-next-line @next/next/no-img-element -- blob preview URLs */}
                <img src={row.previewUrl} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePendingAt(i)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white hover:bg-black/80"
                  disabled={submitting}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          type="button"
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700"
          onClick={() => router.push(`/labs/${labId}/feed`)}
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-ll-navy px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
