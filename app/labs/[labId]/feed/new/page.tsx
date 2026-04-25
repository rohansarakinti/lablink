import Link from "next/link";
import { redirect } from "next/navigation";
import { LabFeedComposer } from "@/components/lab/lab-feed-composer";
import { getLabContext } from "../../_lib";

export default async function NewLabFeedPostPage({ params }: { params: Promise<{ labId: string }> }) {
  const { labId } = await params;
  const context = await getLabContext(labId);

  if (!context.canPostToFeed) {
    redirect(`/labs/${labId}/feed`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        href={`/labs/${labId}/feed`}
        className="inline-flex items-center gap-1 rounded-full border border-ll-navy/15 bg-white/90 px-3 py-1.5 text-sm font-semibold text-ll-navy shadow-sm transition hover:border-ll-purple/30 hover:bg-ll-bg/60"
      >
        ← Back to feed
      </Link>
      <LabFeedComposer labId={labId} userId={context.userId} />
    </div>
  );
}
