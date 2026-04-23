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
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href={`/labs/${labId}/feed`} className="inline-block text-sm font-medium text-ll-navy underline">
        ← Back to feed
      </Link>
      <LabFeedComposer labId={labId} userId={context.userId} />
    </div>
  );
}
