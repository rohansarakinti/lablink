import Link from "next/link";
import { LabFeedPostCard } from "@/components/lab/lab-feed-post-card";
import { Rss, Briefcase } from "lucide-react";

export type ForYouFeedPost = {
  id: string;
  labId: string;
  caption: string;
  media: { url: string; type: string; alt?: string }[];
  createdAt: string;
  labName: string;
  labLogoUrl: string | null;
  authorDisplayName: string | null;
  authorAvatarUrl: string | null;
};

export type ForYouFeedLabPosting = {
  id: string;
  title: string;
  applicationDeadline: string | null;
};

function formatDeadline(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function StudentForYouFeed({
  posts,
  emptyFromFallback,
  openPostingsByLabId,
}: {
  posts: ForYouFeedPost[];
  emptyFromFallback: boolean;
  openPostingsByLabId: Record<string, ForYouFeedLabPosting[]>;
}) {
  return (
    <section className="ll-animate-fade-up ll-delay-200">
      <div className="mb-3">
        <h2 className="group flex items-center gap-2 text-lg font-bold text-ll-navy">
          <Rss className="size-5 text-ll-purple transition-transform duration-300 group-hover:rotate-6" aria-hidden />
          For you
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          {emptyFromFallback
            ? "Recent public updates from the LabLink community."
            : "Updates from labs you follow and from recommendations based on your profile — newest first, with followed labs at the top."}
        </p>
      </div>
      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-10 text-center text-sm text-zinc-600">
          No posts to show yet. Check back as labs share updates, or follow labs from a lab profile.
        </div>
      ) : (
        <ul className="space-y-3.5">
          {posts.map((post) => {
            const sidePostings = openPostingsByLabId[post.labId] ?? [];
            return (
              <li
                key={post.id}
                className="grid overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-all duration-250 hover:-translate-y-0.5 hover:shadow-md sm:grid-cols-1 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(200px,240px)]"
              >
                <div className="min-w-0 bg-white">
                  <Link href={`/dashboard/student/lab/${post.labId}`} className="block h-full min-h-0">
                    <LabFeedPostCard
                      labName={post.labName}
                      labLogoUrl={post.labLogoUrl}
                      authorDisplayName={post.authorDisplayName}
                      authorAvatarUrl={post.authorAvatarUrl}
                      caption={post.caption}
                      media={post.media}
                      createdAt={post.createdAt}
                      compact
                      className="h-full !rounded-none border-0 !shadow-none"
                    />
                  </Link>
                </div>
                <aside
                  className="flex min-h-0 min-w-0 flex-col border-t border-zinc-200 bg-zinc-50/80 p-3 lg:border-l lg:border-t-0 lg:py-3 lg:pl-3 lg:pr-2.5"
                  aria-label={`Open roles at ${post.labName}`}
                >
                  <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                    <Briefcase className="size-3.5 text-zinc-400" aria-hidden />
                    Open roles
                  </p>
                  {sidePostings.length === 0 ? (
                    <p className="text-xs leading-snug text-zinc-500">No open listings from this lab right now.</p>
                  ) : (
                    <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-0.5">
                      {sidePostings.map((item) => {
                        const dl = formatDeadline(item.applicationDeadline);
                        return (
                          <li key={item.id}>
                            <Link
                              href={`/postings/${item.id}`}
                              className="block rounded-lg border border-zinc-200/90 bg-white px-2.5 py-1.5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-ll-purple/30 hover:shadow"
                            >
                              <p className="line-clamp-2 text-[12px] font-semibold leading-snug text-ll-navy">{item.title}</p>
                              {dl ? <p className="mt-0.5 text-[10px] text-zinc-500">Deadline {dl}</p> : null}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {sidePostings.length > 0 ? (
                    <Link
                      href={`/dashboard/student/lab/${post.labId}`}
                      className="mt-2.5 text-[11px] font-semibold text-ll-navy underline-offset-2 hover:underline"
                    >
                      All roles at {post.labName}
                    </Link>
                  ) : null}
                </aside>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
