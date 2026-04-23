import Image from "next/image";
import Link from "next/link";
import { CircleUserRound } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function SiteNavbar() {
  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="bg-ll-purple">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-1.5">
        <Link
          href="/"
          aria-label="Go to home"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
        >
          <Image src="/lablinkLogo.svg" alt="LabLink logo" width={36} height={36} priority />
        </Link>
        {user ? (
          <form action={signOut}>
            <button
              type="submit"
              aria-label="Sign out"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/10 text-white hover:bg-white/20"
            >
              <CircleUserRound aria-hidden="true" size={24} strokeWidth={1.8} />
            </button>
          </form>
        ) : null}
      </div>
    </header>
  );
}
