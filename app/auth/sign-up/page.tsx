import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { SignUpForm } from "./sign-up-form";

type SearchParams = Promise<{ role?: string }>;

function isRole(value: string | undefined): value is "student" | "professor" {
  return value === "student" || value === "professor";
}

export default async function SignUpPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const role = searchParams.role;

  if (!isRole(role)) {
    redirect("/");
  }

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
            Create your account and start matching with top research opportunities.
          </p>
        </section>

        <section className="rounded-md bg-white p-9 pr-20">
          <h2 className="text-4xl font-bold uppercase tracking-wide text-ll-purple">Sign up</h2>
          <p className="mt-2 text-base text-zinc-500">
            Join as <span className="font-semibold">{role}</span>
          </p>
          <div className="mt-6">
            <SignUpForm role={role} />
          </div>
          <p className="mt-5 text-sm text-zinc-500">
            Already have an account?{" "}
            <Link href={`/auth/sign-in?role=${role}`} className="font-semibold underline">
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
