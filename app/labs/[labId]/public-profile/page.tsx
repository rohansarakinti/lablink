import { redirect } from "next/navigation";
import { getLabContext } from "../_lib";
import { PublicProfileEditor } from "./public-profile-editor";

export default async function LabPublicProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ labId: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { labId } = await params;
  const query = await searchParams;
  const context = await getLabContext(labId);

  if (!context.canManage) {
    redirect(`/labs/${labId}`);
  }

  return <PublicProfileEditor labId={labId} lab={context.lab} saved={query.saved === "1"} />;
}
