export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center bg-[#f2f2f2] px-6 py-14">
      <div
        role="status"
        aria-live="polite"
        aria-label="Loading content"
        className="ll-animate-fade-in w-full max-w-md rounded-2xl border border-zinc-200/80 bg-white/95 p-8 text-center shadow-sm backdrop-blur-sm"
      >
        <div className="mx-auto flex w-fit items-center gap-3">
          <span className="ll-loader-ring inline-block h-6 w-6 rounded-full border-2 border-ll-purple/25 border-t-ll-purple" />
          <span className="text-sm font-semibold uppercase tracking-[0.14em] text-zinc-600">
            Loading
          </span>
          <div className="flex items-center gap-1">
            <span className="ll-loader-dot h-1.5 w-1.5 rounded-full bg-ll-purple [animation-delay:0ms]" />
            <span className="ll-loader-dot h-1.5 w-1.5 rounded-full bg-ll-purple [animation-delay:150ms]" />
            <span className="ll-loader-dot h-1.5 w-1.5 rounded-full bg-ll-purple [animation-delay:300ms]" />
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <div className="ll-loader-shimmer h-2 rounded-full bg-linear-to-r from-zinc-100 via-zinc-200 to-zinc-100" />
          <div className="ll-loader-shimmer h-2 w-3/4 rounded-full bg-linear-to-r from-zinc-100 via-zinc-200 to-zinc-100 [animation-delay:220ms]" />
        </div>
      </div>
    </div>
  );
}
