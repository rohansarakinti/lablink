"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";

type CompactFileUploadProps = {
  inputId: string;
  name: string;
  label: string;
  required?: boolean;
  hint?: string;
  accept?: string;
};

export function CompactFileUpload({
  inputId,
  name,
  label,
  required = false,
  hint,
  accept = ".pdf",
}: CompactFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState("");

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="text-lg font-medium text-ll-navy">
        {label}
      </label>
      <input
        ref={inputRef}
        id={inputId}
        name={name}
        type="file"
        accept={accept}
        required={required}
        onChange={(event) => setSelectedFileName(event.target.files?.[0]?.name ?? "")}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-between gap-3 rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-left transition hover:bg-zinc-100"
      >
        <span className="inline-flex items-center gap-2 text-lg text-zinc-700">
          <span className="rounded-md border border-zinc-300 bg-white p-1 text-zinc-500">
            <Upload className="h-4 w-4" />
          </span>
          {selectedFileName || "Upload PDF"}
        </span>
        <span className="rounded-md bg-[#0f3441] px-2.5 py-1.5 text-base font-semibold uppercase tracking-wide text-white">
          Choose file
        </span>
      </button>
      {hint ? <p className="text-base text-zinc-500">{hint}</p> : null}
    </div>
  );
}
