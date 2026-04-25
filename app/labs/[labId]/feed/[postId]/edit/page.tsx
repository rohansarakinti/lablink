import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLabContext } from "../../../_lib";
import { LabFeedEditor } from "@/components/lab/lab-feed-editor";
import type { LabFeedMediaItem } from "../../actions";

export default async function EditLabFeedPostPage({
  params,
}: {
  params: Promise<{ labId: string; postId: string }>;
}) {
  const { labId, postId } = await params;
  const context = await getLabContext(labId);
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("lab_posts")
    .select("id,author_id,caption,media")
    .eq("id", postId)
    .eq("lab_id", labId)
    .maybeSingle<{ id: string; author_id: string; caption: string; media: LabFeedMediaItem[] | null }>();

  if (!post) {
    redirect(`/labs/${labId}/feed`);
  }

  const canEdit = context.canManage || post.author_id === context.userId;
  if (!canEdit) {
    redirect(`/labs/${labId}/feed`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href={`/labs/${labId}/feed`} className="inline-block text-sm font-medium text-ll-navy underline">
        ← Back to feed
      </Link>
      <LabFeedEditor
        labId={labId}
        postId={post.id}
        userId={context.userId}
        initialCaption={post.caption}
        initialMedia={Array.isArray(post.media) ? post.media : []}
      />
    </div>
  );
}
