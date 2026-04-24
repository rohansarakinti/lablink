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

  const hPad = compact ? "px-3.5 sm:px-4" : "px-5";
  const vHeader = compact ? "py-2.5" : "py-4";
  const vBody = compact ? "py-2.5" : "py-4";
  const labLogoSize = compact ? "h-9 w-9" : "h-11 w-11";
  const labSizes = compact ? "36px" : "44px";
  const nameClass = compact ? "truncate text-[13px] font-semibold text-ll-navy" : "truncate text-sm font-semibold text-ll-navy";
  const metaText = compact ? "text-[11px]" : "text-xs";
  const authorSize = compact ? "h-4 w-4" : "h-5 w-5";
  const authorImgSizes = compact ? "16px" : "20px";
  const captionClass = compact
    ? "whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-800"
    : "whitespace-pre-wrap text-sm leading-relaxed text-zinc-800";
  const mediaTop = compact ? "mt-2.5" : "mt-4";
  const singleAspect = compact ? "aspect-[2/1] max-h-48" : "aspect-[16/10]";
  const borderRadius = compact ? "rounded-xl" : "rounded-2xl";
  const innerMediaRadius = compact ? "rounded-lg" : "rounded-xl";

  return (
    <article
      className={cn("overflow-hidden border border-zinc-200 bg-white shadow-sm", borderRadius, className)}
    >
      <div className={`border-b border-zinc-100 ${hPad} ${vHeader}`}>
        <div className={`flex ${compact ? "gap-2.5" : "gap-3"}`}>
          <div
            className={`relative ${labLogoSize} shrink-0 overflow-hidden rounded-full bg-zinc-100 ring-1 ring-zinc-200`}
          >
            {labLogoUrl ? (
              <Image src={labLogoUrl} alt="" fill className="object-cover" sizes={labSizes} unoptimized />
            ) : (
              <span
                className={`flex h-full w-full items-center justify-center font-semibold text-zinc-500 ${
                  compact ? "text-[10px]" : "text-xs"
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
          <div
            className={
              media.length === 1
                ? `${mediaTop} overflow-hidden ${innerMediaRadius} border border-zinc-100 bg-zinc-50`
                : `${mediaTop} grid gap-1.5 sm:grid-cols-2 sm:gap-2`
            }
          >
            {media.map((item, i) => (
              <div
                key={`${item.url}-${i}`}
                className={
                  media.length === 1
                    ? `relative w-full bg-zinc-100 ${singleAspect}`
                    : `relative aspect-video overflow-hidden ${innerMediaRadius} border border-zinc-100 bg-zinc-100`
                }
              >
                <Image
                  src={item.url}
                  alt={item.alt || `Image ${i + 1}`}
                  fill
                  className="object-contain"
                  sizes={media.length === 1 ? "(max-width:768px) 100vw, 600px" : "(max-width:768px) 100vw, 320px"}
                  unoptimized
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}
