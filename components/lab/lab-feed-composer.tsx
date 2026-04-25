"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createLabFeedPost, type LabFeedMediaItem } from "@/app/labs/[labId]/feed/actions";

const allowedMime = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const maxBytes = 5 * 1024 * 1024;
const maxImages = 8;

type PendingFile = { id: string; file: File; previewUrl: string };

export function LabFeedComposer({ labId, userId }: { labId: string; userId: string }) {
  const router = useRouter();
  const [caption, setCaption] = useState("");
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const revokePreviews = useCallback((items: PendingFile[]) => {
    items.forEach((p) => URL.revokeObjectURL(p.previewUrl));
  }, []);

  const onPickFiles = (list: FileList | null) => {
    if (!list?.length) return;
    setError(null);
    const next: PendingFile[] = [];
    for (const file of Array.from(list)) {
      if (pending.length + next.length >= maxImages) {
        setError(`You can attach at most ${maxImages} images.`);
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

  const removeAt = (index: number) => {
    setPending((prev) => {
      const row = prev[index];
      if (row) URL.revokeObjectURL(row.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!caption.trim()) {
      setError("Write a description for your post.");
      return;
    }
    if (pending.length === 0) {
      setError("Add at least one image.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const uploaded: LabFeedMediaItem[] = [];

    try {
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

      const result = await createLabFeedPost({
        labId,
        caption: caption.trim(),
        media: uploaded,
      });

      if (!result.ok) {
        setError(result.error);
        setSubmitting(false);
        return;
      }

      revokePreviews(pending);
      setPending([]);
      setCaption("");
      router.push(`/labs/${labId}/feed`);
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-3xl border border-ll-purple/15 bg-white/95 p-6 shadow-lg shadow-ll-navy/10 md:p-8"
    >
      <div className="mb-5 h-1 w-12 rounded-full bg-gradient-to-r from-ll-purple to-ll-navy" aria-hidden />
      <h2 className="text-xl font-semibold text-ll-navy">Create post</h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600">
        Share photos and a short update with your lab&apos;s followers.
      </p>

      <label htmlFor="feed-caption" className="mt-5 block text-sm font-medium text-ll-navy">
        Description
      </label>
      <textarea
        id="feed-caption"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        rows={6}
        placeholder="What would you like to share?"
        className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-ll-purple/25 focus:border-ll-purple focus:ring-2"
        disabled={submitting}
      />

      <div className="mt-5">
        <p className="text-sm font-medium text-ll-navy">Images</p>
        <p className="mt-0.5 text-xs text-zinc-500">Up to {maxImages} images, 5 MB each.</p>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="mt-2 block w-full text-sm text-zinc-600 file:mr-3 file:rounded-full file:border-0 file:bg-gradient-to-r file:from-ll-purple file:to-ll-navy file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:brightness-105"
          disabled={submitting}
          onChange={(e) => {
            onPickFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {pending.length > 0 ? (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {pending.map((row, i) => (
            <li key={row.id} className="relative aspect-square overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
              {/* eslint-disable-next-line @next/next/no-img-element -- blob preview URLs */}
              <img src={row.previewUrl} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute right-1 top-1 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white hover:bg-black/80"
                disabled={submitting}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-zinc-100 pt-5">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-gradient-to-r from-ll-purple to-ll-navy px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-ll-purple/25 transition hover:brightness-105 disabled:opacity-50"
        >
          {submitting ? "Publishing…" : "Post"}
        </button>
      </div>
    </form>
  );
}
