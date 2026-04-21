"use client";

import { useState } from "react";

type MultiSelectOption = { value: string; label: string };

export function MultiSelectDropdown({
  label,
  values,
  options,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  options: MultiSelectOption[];
  onChange: (values: string[]) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);

  function toggleValue(value: string) {
    if (values.includes(value)) {
      onChange(values.filter((item) => item !== value));
      return;
    }
    onChange([...values, value]);
  }

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-ll-navy">
        {label}
        <span className="text-xs text-zinc-500">(optional)</span>
      </label>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700"
      >
        <span>{values.length > 0 ? `${values.length} selected` : placeholder}</span>
        <span className="text-zinc-500">{open ? "▲" : "▼"}</span>
      </button>
      {open ? (
        <div className="max-h-48 overflow-auto rounded-lg border border-zinc-200 bg-zinc-50 p-2">
          {options.map((option) => {
            const checked = values.includes(option.value);
            return (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-zinc-100"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleValue(option.value)}
                  className="h-4 w-4 rounded border-zinc-300"
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
      ) : null}
      {values.length > 0 ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {values.map((value) => (
            <span
              key={value}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700"
            >
              {value}
              <button
                type="button"
                onClick={() => toggleValue(value)}
                className="text-zinc-500 hover:text-zinc-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
