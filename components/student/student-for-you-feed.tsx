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
        <h2 className="group flex items-center gap-2 text-2xl font-bold text-ll-navy">
          <Rss className="size-5 text-ll-purple transition-transform duration-300 group-hover:rotate-6" aria-hidden />
          For you
        </h2>
        <p className="mt-1 text-lg text-zinc-600">
          {emptyFromFallback
            ? "Recent public updates from the LabLink community."
            : "Updates from labs you follow and from recommendations based on your profile, newest first, with followed labs at the top."}
        </p>
      </div>
      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-10 text-center text-base text-zinc-600">
          No posts to show yet. Check back as labs share updates, or follow labs from a lab profile.
        </div>
      ) : (
        <ul className="flex flex-row flex-wrap items-start justify-start gap-x-4 gap-y-6">
          {posts.map((post) => {
            const sidePostings = openPostingsByLabId[post.labId] ?? [];
            return (
              <li key={post.id} className="w-full max-w-[16.5rem] shrink-0 sm:w-[17.25rem] sm:max-w-none">
                <Link href={`/dashboard/student/lab/${post.labId}`} className="block">
                  <LabFeedPostCard
                    labName={post.labName}
                    labLogoUrl={post.labLogoUrl}
                    authorDisplayName={post.authorDisplayName}
                    authorAvatarUrl={post.authorAvatarUrl}
                    caption={post.caption}
                    media={post.media}
                    createdAt={post.createdAt}
                    compact
                  />
                </Link>
                <div className="mt-1.5 rounded-lg border border-zinc-200 bg-zinc-50/80 px-2.5 py-2">
                  <p className="mb-1.5 flex items-center gap-1.5 text-base font-bold uppercase tracking-wide text-zinc-500">
                    <Briefcase className="size-3.5 text-zinc-400" aria-hidden />
                    Open roles
                  </p>
                  {sidePostings.length === 0 ? (
                    <p className="text-base leading-snug text-zinc-500">None right now</p>
                  ) : (
                    <ul className="space-y-1">
                      {sidePostings.slice(0, 2).map((item) => {
                        const dl = formatDeadline(item.applicationDeadline);
                        return (
                          <li key={item.id}>
                            <Link
                              href={`/postings/${item.id}`}
                              className="block rounded-md border border-zinc-200 bg-white px-2 py-1 text-left transition-colors hover:border-ll-purple/30"
                            >
                              <p className="line-clamp-1 text-base font-semibold leading-snug text-ll-navy">{item.title}</p>
                              {dl ? <p className="text-sm text-zinc-500">Deadline {dl}</p> : null}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
