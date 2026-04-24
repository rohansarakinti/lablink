import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-full bg-[#f2f2f2]">
      <main className="mx-auto w-full max-w-6xl px-6 pb-16 pt-8">
        <section className="ll-animate-fade-up">
          <h1 className="whitespace-nowrap text-[clamp(1.4rem,5vw,4.5rem)] font-bold leading-tight text-black">
            The hub for elite academic collaboration.
          </h1>
          <p className="ll-animate-fade-up ll-delay-100 mt-4 max-w-2xl text-lg text-ll-gray">
            Bridging the gap between groundbreaking research projects and the next generation of
            academic talent.
          </p>
        </section>

        <section className="mt-10 grid gap-5 md:grid-cols-2">
          <article className="ll-animate-scale-in ll-delay-100 rounded-3xl bg-ll-purple p-7 text-white shadow-sm transition-transform duration-300 ease-out hover:-translate-y-1 hover:shadow-xl">
            <p className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
              For scholars
            </p>
            <h2 className="mt-5 text-3xl font-semibold">Students</h2>
            <p className="mt-3 max-w-md text-sm text-white/90">
              Discover research opportunities, join prestigious labs, and find mentorship to
              accelerate your academic career.
            </p>
            <div className="mt-10 flex items-center gap-4">
              <Link
                href="/auth/sign-in?role=student"
                className="text-sm font-semibold uppercase transition-opacity duration-200 hover:opacity-85"
              >
                Sign in / sign up
              </Link>
              <Link
                href="/auth/sign-in?role=student"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-white/40 text-base transition-transform duration-200 hover:translate-x-1"
              >
                →
              </Link>
            </div>
          </article>

          <article className="ll-animate-scale-in ll-delay-200 rounded-3xl bg-gradient-to-r from-[#0d2f3a] to-[#0e3f49] p-7 text-white shadow-sm transition-transform duration-300 ease-out hover:-translate-y-1 hover:shadow-xl">
            <p className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
              For investigators
            </p>
            <h2 className="mt-5 text-3xl font-semibold">Professors</h2>
            <p className="mt-3 max-w-md text-sm text-white/90">
              Manage your lab&apos;s digital presence, post research vacancies, and recruit the
              highest-caliber students globally.
            </p>
            <div className="mt-10 flex items-center gap-4">
              <Link
                href="/auth/sign-in?role=professor"
                className="text-sm font-semibold uppercase transition-opacity duration-200 hover:opacity-85"
              >
                Sign in / sign up
              </Link>
              <Link
                href="/auth/sign-in?role=professor"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-white/40 text-base transition-transform duration-200 hover:translate-x-1"
              >
                →
              </Link>
            </div>
          </article>
        </section>

        <section className="ll-animate-fade-in ll-delay-300 mt-10 overflow-hidden rounded-3xl">
          <Image
            src="https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1800&q=80"
            alt="Research lab scene"
            width={1800}
            height={1200}
            priority
            className="ll-float-slow h-[260px] w-full object-cover transition-transform duration-700 ease-out hover:scale-[1.03] md:h-[300px]"
          />
        </section>

      </main>
    </div>
  );
}
