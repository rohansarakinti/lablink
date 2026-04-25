"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { useFormStatus } from "react-dom";
import { Upload } from "lucide-react";
import type { LabContext } from "../_lib";
import { saveLabPublicProfile } from "./actions";
import { createClient } from "@/lib/supabase/client";

type Props = {
  labId: string;
  lab: LabContext["lab"];
  saved: boolean;
};

const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp";

export function PublicProfileEditor({ labId, lab, saved }: Props) {
  const supabase = useMemo(() => createClient(), []);

  const [bannerSrc, setBannerSrc] = useState(lab.banner_url || "/window.svg");
  const [bannerUrl, setBannerUrl] = useState(lab.banner_url || "");
  const [bannerUploadError, setBannerUploadError] = useState<string | null>(null);
  const [bannerUploading, setBannerUploading] = useState(false);

  const [logoSrc, setLogoSrc] = useState(lab.logo_url || "/window.svg");
  const [logoUrl, setLogoUrl] = useState(lab.logo_url || "");
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  const [galleryUrls, setGalleryUrls] = useState<string[]>(() => [...lab.gallery_urls]);
  const [galleryUploadError, setGalleryUploadError] = useState<string | null>(null);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [preserveGallery, setPreserveGallery] = useState(true);

  const uploadImage = async (userId: string, file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const filePath = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("lab-assets").upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from("lab-assets").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const onBannerSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBannerUploadError(null);
    setBannerUploading(true);
    setBannerSrc(URL.createObjectURL(file));
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setBannerUploadError("Sign in again, then retry the upload.");
        return;
      }
      const url = await uploadImage(user.id, file);
      setBannerUrl(url);
      setBannerSrc(url);
    } catch (error) {
      setBannerUploadError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBannerUploading(false);
      event.target.value = "";
    }
  };

  const onLogoSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLogoUploadError(null);
    setLogoUploading(true);
    setLogoSrc(URL.createObjectURL(file));
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLogoUploadError("Sign in again, then retry the upload.");
        return;
      }
      const url = await uploadImage(user.id, file);
      setLogoUrl(url);
      setLogoSrc(url);
    } catch (error) {
      setLogoUploadError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setLogoUploading(false);
      event.target.value = "";
    }
  };

  const onGallerySelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;
    setGalleryUploadError(null);
    setGalleryUploading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setGalleryUploadError("Sign in again, then retry the upload.");
        return;
      }
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadImage(user.id, file);
        uploaded.push(url);
      }
      setGalleryUrls((prev) => {
        const next = preserveGallery ? [...prev, ...uploaded] : uploaded;
        return next.slice(0, 8);
      });
    } catch (error) {
      setGalleryUploadError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setGalleryUploading(false);
      event.target.value = "";
    }
  };

  return (
    <form action={saveLabPublicProfile} className="space-y-5">
      <input type="hidden" name="lab_id" value={labId} />
      <input type="hidden" name="banner_url" value={bannerUrl} />
      <input type="hidden" name="logo_url" value={logoUrl} />
      {galleryUrls.map((url) => (
        <input key={url} type="hidden" name="gallery_urls" value={url} />
      ))}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-ll-navy">Public profile editor</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Update media and messaging students see before applying. Images upload immediately; save writes URLs to
              your lab profile.
            </p>
          </div>
          <SaveButton />
        </div>
        {saved ? (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Public profile saved.
          </p>
        ) : null}
      </section>

      <section className="grid gap-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm lg:grid-cols-2">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-600">Media</h3>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Banner</p>
            <img src={bannerSrc} alt="" className="h-40 w-full rounded-xl border border-zinc-200 object-cover" />
            <CompactUpload
              label="Upload banner image"
              inputId="lab_banner_file"
              accept={IMAGE_ACCEPT}
              helperText={bannerUploadError ?? (bannerUploading ? "Uploading..." : "PNG, JPG, or WEBP.")}
              badge={bannerUploadError ? "Upload failed" : bannerUploading ? "Uploading..." : "Image"}
              onChange={onBannerSelected}
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Logo</p>
            <img src={logoSrc} alt="" className="mx-auto h-32 w-32 rounded-2xl border border-zinc-200 object-cover" />
            <CompactUpload
              label="Upload logo"
              inputId="lab_logo_file"
              accept={IMAGE_ACCEPT}
              helperText={logoUploadError ?? (logoUploading ? "Uploading..." : "PNG, JPG, or WEBP.")}
              badge={logoUploadError ? "Upload failed" : logoUploading ? "Uploading..." : "Image"}
              onChange={onLogoSelected}
            />
          </div>

          <div className="space-y-2">
            <CompactUpload
              label="Add gallery images"
              inputId="lab_gallery_files"
              accept={IMAGE_ACCEPT}
              multiple
              helperText={
                galleryUploadError ??
                (galleryUploading ? "Uploading..." : "Up to 8 images total. PNG, JPG, or WEBP.")
              }
              badge={galleryUploadError ? "Upload failed" : galleryUploading ? "Uploading..." : "Images"}
              onChange={onGallerySelected}
            />
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={preserveGallery}
                onChange={(e) => setPreserveGallery(e.target.checked)}
              />
              Keep current gallery and append new uploads (off = replace with this batch only)
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-600">Gallery preview</h3>
          <p className="text-xs text-zinc-500">
            Banner: {bannerUrl ? "ready" : "none"} · Logo: {logoUrl ? "ready" : "none"} · Gallery: {galleryUrls.length}
            /8
          </p>
          {galleryUrls.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {galleryUrls.map((url) => (
                <div key={url} className="relative">
                  <img src={url} alt="" className="h-20 w-full rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => setGalleryUrls((prev) => prev.filter((u) => u !== url))}
                    className="absolute right-1 top-1 rounded-full bg-zinc-900/85 px-1.5 py-0.5 text-[10px] font-medium text-white"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No gallery images yet.</p>
          )}
        </div>
      </section>

      <section className="grid gap-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm lg:grid-cols-2">
        <div className="space-y-3">
          <Input label="Tagline" name="tagline" defaultValue={lab.tagline ?? ""} />
          <Input label="Website URL" name="website_url" defaultValue={lab.website_url ?? ""} />
          <Textarea label="Description" name="description" rows={6} defaultValue={lab.description ?? ""} />
        </div>
        <div className="space-y-3">
          <Input label="Research fields (comma-separated)" name="research_fields" defaultValue={lab.research_fields.join(", ")} />
          <Input label="Research tags (comma-separated)" name="research_tags" defaultValue={lab.research_tags.join(", ")} />
          <Textarea label="Who should apply?" name="student_fit" rows={4} defaultValue={lab.student_fit ?? ""} />
          <Textarea label="Expected weekly commitment" name="expectations" rows={4} defaultValue={lab.expectations ?? ""} />
        </div>
      </section>
    </form>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-full bg-ll-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
    >
      {pending ? "Saving..." : "Save public profile"}
    </button>
  );
}

function Input({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
      />
    </label>
  );
}

function Textarea({
  label,
  name,
  defaultValue,
  rows,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  rows: number;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
      />
    </label>
  );
}

function CompactUpload({
  label,
  inputId,
  helperText,
  onChange,
  accept = ".pdf",
  badge = "Upload",
  multiple,
}: {
  label: string;
  inputId: string;
  helperText?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  accept?: string;
  badge?: string;
  multiple?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </label>
      <label
        htmlFor={inputId}
        className="flex cursor-pointer items-center justify-between rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
      >
        <span className="inline-flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Choose file
        </span>
        <span className="text-xs text-zinc-500">{badge}</span>
      </label>
      <input
        id={inputId}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={onChange}
        className="hidden"
      />
      {helperText ? <p className="text-xs text-zinc-500">{helperText}</p> : null}
    </div>
  );
}
