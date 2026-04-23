"use client";

import { Bell } from "lucide-react";

export function ProfessorTopBar() {
  return (
    <div className="border-b border-zinc-200/90 bg-[#fafafa]">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-6">
        <p className="text-sm font-medium text-zinc-700">Professor workspace</p>
        <div className="flex shrink-0 items-center justify-end gap-2">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200/80 bg-white text-zinc-500 hover:bg-zinc-50"
            aria-label="Notifications"
            title="Notifications (coming soon)"
          >
            <Bell className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
