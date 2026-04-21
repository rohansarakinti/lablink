import Link from "next/link";
import Image from "next/image";
import { SignInForm } from "./sign-in-form";

type SearchParams = Promise<{ role?: string }>;

function getRoleLabel(role?: string) {
  if (role === "student") return "student";
  if (role === "professor") return "professor";
  return null;
}

export default async function SignInPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const role = getRoleLabel(searchParams.role);

  return (
    <main className="min-h-full bg-[#f2f2f2]">
      <div className="mx-auto grid w-full max-w-[1400px] gap-10 px-6 py-16 lg:grid-cols-[1fr_500px] lg:items-center">
        <section className="mx-auto max-w-xl">
          <Image
            src="/lablinkLogo.svg"
            alt="LabLink"
            width={420}
            height={120}
            priority
            className="h-auto w-[280px] md:w-[420px]"
          />
          <p className="mt-6 text-3xl leading-snug text-zinc-600">
            Connect with top students for your research lab. Streamline talent discovery for
            academic excellence.
          </p>
        </section>

        <section className="rounded-md bg-white p-9 pr-20">
          <h2 className="text-4xl font-bold uppercase tracking-wide text-ll-purple">Sign in</h2>
          <p className="mt-2 text-base text-zinc-500">Access your dashboard</p>
          <div className="mt-6">
            <SignInForm />
          </div>
          <p className="mt-5 text-sm text-zinc-500">
            Need an account?{" "}
            <Link href={role ? `/auth/sign-up?role=${role}` : "/"} className="font-semibold underline">
              Create one
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
