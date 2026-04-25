import Link from "next/link";
import { getLabContext } from "./_lib";

const tabs = [
  { href: "", label: "Overview" },
  { href: "members", label: "Members" },
  { href: "feed", label: "Feed" },
  { href: "postings", label: "Role postings" },
];

export default async function LabLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ labId: string }>;
}>) {
  const { labId } = await params;
  const context = await getLabContext(labId);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-10">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <Link
          href="/dashboard/professor"
          className="inline-flex rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          ← Back to dashboard
        </Link>
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Lab management</p>
        <h1 className="mt-2 text-3xl font-semibold text-ll-navy">{context.lab.name}</h1>
        <p className="mt-2 text-sm text-zinc-600">
          {context.lab.university}
          {context.lab.department ? ` · ${context.lab.department}` : ""}
        </p>
      </div>

      <nav className="mt-6 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={`/labs/${labId}${tab.href ? `/${tab.href}` : ""}`}
            className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <section className="mt-6">{children}</section>
    </main>
  );
}
