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
      <div className="flex w-full items-center justify-between pl-4 pr-6 py-1">
        <Link
          href="/"
          aria-label="Go to home"
          // className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm"
        >
          <Image src="/LabLink-Logo_logo-White.svg" alt="LabLink logo" width={100} height={100} priority />
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
