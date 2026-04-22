import Link from "next/link";

export default function StudentProfilePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-ll-navy md:text-3xl">My profile</h1>
      <p className="mt-1 text-sm text-zinc-600">Profile editing and visibility controls will live here.</p>
      <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6">
        <p className="text-sm text-zinc-600">
          For now, you can return to the onboarding flow to update your research interests, skills, and documents.
        </p>
        <Link
          href="/onboarding/student"
          className="mt-4 inline-flex rounded-lg bg-ll-navy px-4 py-2.5 text-sm font-semibold text-white"
        >
          Open onboarding
        </Link>
      </div>
    </div>
  );
}
