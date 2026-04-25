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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-ll-navy">Feed</h2>
          <p className="mt-1 text-sm text-zinc-600">Updates from your lab, visible to followers and on your public presence.</p>
        </div>
        {context.canPostToFeed ? (
          <Link
            href={`/labs/${labId}/feed/new`}
            className="w-fit rounded-full bg-ll-navy px-4 py-2 text-sm font-semibold text-white"
          >
            New post
          </Link>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Could not load posts. If you just added this feature, run the latest database migration.
        </p>
      ) : null}

      {!error && posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center">
          <p className="text-sm text-zinc-600">No posts yet.</p>
          {context.canPostToFeed ? (
            <Link href={`/labs/${labId}/feed/new`} className="mt-3 inline-block text-sm font-semibold text-ll-navy underline">
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
