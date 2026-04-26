import Link from "next/link";
import { LabManagementNav } from "@/components/lab/lab-management-nav";
import { getLabContext } from "./_lib";

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
    <main className="relative min-h-screen w-full overflow-x-hidden bg-ll-bg/40">
      <div className="pointer-events-none absolute right-[max(0px,calc(50%-38rem))] top-32 h-64 w-64 rounded-full bg-ll-bg/50 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute left-[max(0px,calc(50%-36rem))] top-48 h-56 w-56 rounded-full bg-ll-purple/15 blur-3xl" aria-hidden />

      <div className="relative mx-auto w-full max-w-6xl px-6 py-10">
        <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/85 p-6 shadow-lg shadow-ll-navy/8 backdrop-blur-md md:p-8">
          <div className="mb-6 h-1 w-full rounded-full bg-ll-purple" aria-hidden />
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex min-w-0 flex-1 gap-4">
              {context.lab.logo_url ? (
                <div className="hidden shrink-0 overflow-hidden rounded-2xl border-2 border-white shadow-md ring-2 ring-ll-purple/20 sm:block sm:h-20 sm:w-20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={context.lab.logo_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div
                  className="hidden h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-ll-bg text-2xl font-bold text-ll-navy shadow-inner sm:flex"
                  aria-hidden
                >
                  {context.lab.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <Link
                  href="/dashboard/professor"
                  className="inline-flex items-center gap-1 rounded-full border border-ll-navy/15 bg-ll-bg/50 px-3 py-1 text-xs font-semibold text-ll-navy transition hover:border-ll-purple/30 hover:bg-white"
                >
                  <span aria-hidden>←</span> Back to dashboard
                </Link>
                <p className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-ll-purple">Lab management</p>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ll-navy md:text-4xl">{context.lab.name}</h1>
                <p className="mt-2 text-sm text-zinc-600">
                  {context.lab.university}
                  {context.lab.department ? ` · ${context.lab.department}` : ""}
                </p>
              </div>
            </div>
            {context.lab.tagline ? (
              <p className="max-w-md rounded-2xl border border-ll-purple/15 bg-ll-bg/70 px-4 py-3 text-sm italic leading-relaxed text-zinc-700 md:text-right">
                {context.lab.tagline}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6">
          <LabManagementNav labId={labId} />
        </div>

        <section className="mt-8 pb-10">{children}</section>
      </div>
    </main>
  );
}
