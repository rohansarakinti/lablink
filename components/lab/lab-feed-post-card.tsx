import Image from "next/image";

export type LabFeedPostCardProps = {
  labName: string;
  labLogoUrl: string | null;
  authorDisplayName: string | null;
  authorAvatarUrl: string | null;
  caption: string;
  media: { url: string; type: string; alt?: string }[];
  createdAt: string;
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
}: LabFeedPostCardProps) {
  const authorLabel = authorDisplayName?.trim() || "Lab member";

  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-5 py-4">
        <div className="flex gap-3">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-zinc-100 ring-1 ring-zinc-200">
            {labLogoUrl ? (
              <Image src={labLogoUrl} alt="" fill className="object-cover" sizes="44px" unoptimized />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-zinc-500">
                {labName.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ll-navy">{labName}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-500">
              <span className="flex items-center gap-1.5">
                {authorAvatarUrl ? (
                  <span className="relative inline-block h-5 w-5 shrink-0 overflow-hidden rounded-full ring-1 ring-zinc-200">
                    <Image src={authorAvatarUrl} alt="" fill className="object-cover" sizes="20px" unoptimized />
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

      <div className="px-5 py-4">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">{caption}</p>
        {media.length > 0 ? (
          <div
            className={
              media.length === 1
                ? "mt-4 overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50"
                : "mt-4 grid gap-2 sm:grid-cols-2"
            }
          >
            {media.map((item, i) => (
              <div
                key={`${item.url}-${i}`}
                className={
                  media.length === 1
                    ? "relative aspect-[16/10] w-full bg-zinc-100"
                    : "relative aspect-video overflow-hidden rounded-xl border border-zinc-100 bg-zinc-100"
                }
              >
                <Image
                  src={item.url}
                  alt={item.alt || `Image ${i + 1}`}
                  fill
                  className="object-contain"
                  sizes={media.length === 1 ? "(max-width:768px) 100vw, 720px" : "(max-width:768px) 100vw, 360px"}
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
