import Image from "next/image";
import Link from "next/link";
import { Activity } from "lucide-react";
import { formatShortRelativeTime } from "@/lib/relative-time";

const STATUS_COPY: Record<string, string> = {
  submitted: "Submitted",
  reviewing: "Under review",
  interview: "Interview",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export type ApplicationActivityItem = {
  id: string;
  status: string;
  statusUpdatedAt: string;
  /** Role title; falls back in UI if missing. */
  roleTitle: string;
  /** Lab display name. */
  labName: string;
  labLogoUrl: string | null;
};

function statusLabel(status: string) {
  return STATUS_COPY[status] ?? status;
}

export function RecentApplicationActivity({ items }: { items: ApplicationActivityItem[] }) {
  return (
    <section className="ll-animate-fade-up ll-delay-100">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="group flex items-center gap-2 text-lg font-bold text-ll-navy">
            <Activity className="size-5 text-ll-purple transition-transform duration-300 group-hover:-translate-y-0.5" aria-hidden />
            Recent activity
          </h2>
          <p className="mt-1 text-sm text-zinc-600">The latest status updates on applications you have submitted.</p>
        </div>
        <Link
          href="/dashboard/student/applications"
          className="text-sm font-medium text-ll-navy underline-offset-2 hover:underline"
        >
          All applications
        </Link>
      </div>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-10 text-center text-base text-zinc-600">
          No applications yet. When you apply to a role, status changes from labs will show up here.
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((row) => (
            <li key={row.id}>
              <Link
                href="/dashboard/student/applications"
                className="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm transition-all duration-250 hover:-translate-y-0.5 hover:shadow-md sm:gap-4 sm:p-4"
              >
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50">
                  {row.labLogoUrl ? (
                    <Image src={row.labLogoUrl} alt="" fill className="object-contain p-1" unoptimized />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-sm font-bold text-zinc-500">
                      {row.labName.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-medium text-ll-navy">
                    <span className="line-clamp-1">{row.roleTitle}</span>{" "}
                    <span className="text-zinc-500">· {row.labName}</span>
                  </p>
                  <p className="mt-0.5 text-base text-zinc-700">
                    <span className="font-semibold text-zinc-800">{statusLabel(row.status)}</span>
                    <span className="text-zinc-500"> · {formatShortRelativeTime(row.statusUpdatedAt)}</span>
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
