import Link from "next/link";
import { LabFeedPostCard } from "@/components/lab/lab-feed-post-card";
import { getLabContext } from "../_lib";
import { createClient } from "@/lib/supabase/server";

type ProfileSnippet = { display_name: string | null; avatar_url: string | null };

type LabPostRow = {
  id: string;
  caption: string;
  media: { url: string; type: string; alt?: string }[];
  created_at: string;
  author_id: string;
  profiles: ProfileSnippet | ProfileSnippet[] | null;
};

function normalizeProfile(p: LabPostRow["profiles"]): ProfileSnippet | null {
  if (!p) return null;
  return Array.isArray(p) ? p[0] ?? null : p;
}

export default async function LabFeedPage({ params }: { params: Promise<{ labId: string }> }) {
  const { labId } = await params;
  const context = await getLabContext(labId);
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("lab_posts")
    .select("id,caption,media,created_at,author_id,profiles(display_name,avatar_url)")
    .eq("lab_id", labId)
    .order("created_at", { ascending: false })
    .returns<LabPostRow[]>();

  const posts = rows ?? [];

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-3xl border border-ll-purple/15 bg-gradient-to-br from-ll-bg/70 via-white to-ll-purple/10 p-6 shadow-md shadow-ll-navy/5 md:flex md:items-end md:justify-between md:p-8">
        <div>
          <div className="h-1 w-14 rounded-full bg-gradient-to-r from-ll-purple to-ll-navy" aria-hidden />
          <h2 className="mt-3 text-2xl font-semibold text-ll-navy md:text-3xl">Feed</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-600">
            Share photos and updates from your lab—visible to followers and on your public presence.
          </p>
        </div>
        {context.canPostToFeed ? (
          <Link
            href={`/labs/${labId}/feed/new`}
            className="mt-5 inline-flex w-fit shrink-0 rounded-full bg-gradient-to-r from-ll-purple to-ll-navy px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-ll-purple/25 transition hover:brightness-105 md:mt-0"
          >
            New post
          </Link>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 to-orange-50/50 px-4 py-3 text-sm font-medium text-red-900">
          Could not load posts. If you just added this feature, run the latest database migration.
        </p>
      ) : null}

      {!error && posts.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-ll-purple/20 bg-gradient-to-br from-ll-purple/10 via-white to-ll-bg/50 px-6 py-12 text-center">
          <p className="text-sm font-medium text-zinc-700">No posts yet.</p>
          <p className="mt-2 text-sm text-zinc-500">Highlights, milestones, and day-in-the-lab moments belong here.</p>
          {context.canPostToFeed ? (
            <Link
              href={`/labs/${labId}/feed/new`}
              className="mt-5 inline-flex rounded-full bg-gradient-to-r from-ll-purple to-ll-navy px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:brightness-105"
            >
              Create the first post
            </Link>
          ) : null}
        </div>
      ) : null}

      {!error && posts.length > 0 ? (
        <ul className="flex flex-row flex-wrap items-start justify-start gap-x-4 gap-y-6">
          {posts.map((post) => {
            const author = normalizeProfile(post.profiles);
            const canEdit = context.canManage || post.author_id === context.userId;
            return (
              <li
                key={post.id}
                className="w-full max-w-[16.5rem] shrink-0 sm:w-[17.25rem] sm:max-w-none"
              >
                {canEdit ? (
                  <div className="mb-1.5 flex justify-start">
                    <Link
                      href={`/labs/${labId}/feed/${post.id}/edit`}
                      className="text-[11px] font-semibold uppercase tracking-wide text-ll-purple"
                    >
                      Edit post
                    </Link>
                  </div>
                ) : null}
                <LabFeedPostCard
                  labName={context.lab.name}
                  labLogoUrl={context.lab.logo_url}
                  authorDisplayName={author?.display_name ?? null}
                  authorAvatarUrl={author?.avatar_url ?? null}
                  caption={post.caption}
                  media={Array.isArray(post.media) ? post.media : []}
                  createdAt={post.created_at}
                />
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
