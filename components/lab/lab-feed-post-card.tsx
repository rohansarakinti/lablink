import Image from "next/image";
import { cn } from "@/lib/utils";

export type LabFeedPostCardProps = {
  labName: string;
  labLogoUrl: string | null;
  authorDisplayName: string | null;
  authorAvatarUrl: string | null;
  caption: string;
  media: { url: string; type: string; alt?: string }[];
  createdAt: string;
  /** Slightly smaller padding, type, and media — good for student dashboard feeds. */
  compact?: boolean;
  className?: string;
};

function formatFeedTime(iso: string) {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  if (diffMs < 60_000) return "Just now";
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function LabFeedPostCard({
  labName,
  labLogoUrl,
  authorDisplayName,
  authorAvatarUrl,
  caption,
  media,
  createdAt,
  compact = false,
  className,
}: LabFeedPostCardProps) {
  const authorLabel = authorDisplayName?.trim() || "Lab member";

  const hPad = compact ? "px-2.5 sm:px-3" : "px-3 sm:px-3.5";
  const vHeader = compact ? "py-2" : "py-2.5";
  const vBody = compact ? "py-2" : "py-2.5";
  const labLogoSize = compact ? "h-8 w-8" : "h-9 w-9";
  const labSizes = compact ? "32px" : "36px";
  const nameClass = compact ? "truncate text-[13px] font-semibold text-ll-navy" : "truncate text-[13px] font-semibold text-ll-navy";
  const metaText = compact ? "text-[11px]" : "text-[11px]";
  const authorSize = compact ? "h-3.5 w-3.5" : "h-4 w-4";
  const authorImgSizes = compact ? "14px" : "16px";
  const captionClass = compact
    ? "whitespace-pre-wrap text-[13px] leading-snug text-zinc-800"
    : "whitespace-pre-wrap text-[13px] leading-snug text-zinc-800";
  const mediaTop = compact ? "mt-2" : "mt-2.5";
  /** Narrow “tile” card, left-aligned in the feed column. */
  const mediaShell = "w-full";
  const singleFrame = compact ? "relative h-32 w-full sm:h-36" : "relative h-36 w-full sm:h-40";
  const multiFrame = compact ? "relative h-24 w-full sm:h-28" : "relative h-28 w-full sm:h-32";
  const borderRadius = compact ? "rounded-md" : "rounded-lg";
  const innerMediaRadius = compact ? "rounded-md" : "rounded-md";

  return (
    <article
      className={cn(
        "w-full max-w-[16.5rem] self-start overflow-hidden border border-zinc-200 bg-white shadow-sm sm:max-w-[17.25rem]",
        borderRadius,
        className,
      )}
    >
      <div className={`border-b border-zinc-100 ${hPad} ${vHeader}`}>
        <div className={`flex ${compact ? "gap-2.5" : "gap-3"}`}>
          <div
            className={`relative ${labLogoSize} shrink-0 overflow-hidden rounded-full bg-zinc-100 ring-1 ring-zinc-200`}
          >
            {labLogoUrl ? (
              <Image src={labLogoUrl} alt="" fill className="object-contain p-1" sizes={labSizes} unoptimized />
            ) : (
              <span
                className={`flex h-full w-full items-center justify-center font-semibold text-zinc-500 ${
                  compact ? "text-[11px]" : "text-xs"
                }`}
              >
                {labName.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className={nameClass}>{labName}</p>
            <div
              className={`mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 ${metaText} text-zinc-500`}
            >
              <span className="flex items-center gap-1.5">
                {authorAvatarUrl ? (
                  <span
                    className={`relative inline-block ${authorSize} shrink-0 overflow-hidden rounded-full ring-1 ring-zinc-200`}
                  >
                    <Image
                      src={authorAvatarUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes={authorImgSizes}
                      unoptimized
                    />
                  </span>
                ) : null}
                <span className="font-medium text-zinc-600">{authorLabel}</span>
              </span>
              <span aria-hidden="true">·</span>
              <time dateTime={createdAt}>{formatFeedTime(createdAt)}</time>
            </div>
          </div>
        </div>
      </div>

      <div className={`${hPad} ${vBody}`}>
        <p className={captionClass}>{caption}</p>
        {media.length > 0 ? (
          <div className={`${mediaTop} ${mediaShell}`}>
            <div
              className={
                media.length === 1
                  ? `overflow-hidden ${innerMediaRadius} border border-zinc-100 bg-zinc-50`
                  : `grid gap-1.5 sm:grid-cols-2 sm:gap-2`
              }
            >
              {media.map((item, i) => (
                <div
                  key={`${item.url}-${i}`}
                  className={
                    media.length === 1
                      ? `${singleFrame} overflow-hidden ${innerMediaRadius}`
                      : `${multiFrame} overflow-hidden ${innerMediaRadius}`
                  }
                >
                  <Image
                    src={item.url}
                    alt={item.alt || `Image ${i + 1}`}
                    fill
                    className="object-contain"
                    sizes={
                      media.length === 1
                        ? "(max-width: 640px) 90vw, 280px"
                        : "(max-width: 640px) 45vw, 140px"
                    }
                    unoptimized
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
