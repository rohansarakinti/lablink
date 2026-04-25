"use client";

import { useFormStatus } from "react-dom";
import type { LabContext } from "../_lib";
import { saveLabPublicProfile } from "./actions";

type Props = {
  labId: string;
  lab: LabContext["lab"];
  saved: boolean;
};

export function PublicProfileEditor({ labId, lab, saved }: Props) {
  return (
    <form action={saveLabPublicProfile} className="space-y-5">
      <input type="hidden" name="lab_id" value={labId} />

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-ll-navy">Public profile editor</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Update media and messaging students see before applying.
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
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-600">Media</h3>
          <p className="text-xs text-zinc-500">Upload files to replace current images.</p>
          <FileInput label="Replace banner" name="banner_file" />
          <FileInput label="Replace logo" name="logo_file" />
          <FileInput label="Add gallery images" name="gallery_files" multiple />
          <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
            <input type="checkbox" name="preserve_existing_gallery" value="true" defaultChecked />
            Keep existing gallery images and append new uploads
          </label>
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-600">Current assets</h3>
          <p className="text-xs text-zinc-500">
            Banner: {lab.banner_url ? "set" : "none"} · Logo: {lab.logo_url ? "set" : "none"} · Gallery:{" "}
            {lab.gallery_urls.length}
          </p>
          {lab.gallery_urls.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {lab.gallery_urls.slice(0, 8).map((url) => (
                <img key={url} src={url} alt="" className="h-20 w-full rounded-lg object-cover" />
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

function FileInput({ label, name, multiple }: { label: string; name: string; multiple?: boolean }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</span>
      <input
        type="file"
        name={name}
        accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
        multiple={multiple}
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
      />
    </label>
  );
}
