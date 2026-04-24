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
    <header className="ll-animate-fade-in border-b border-white/15 bg-ll-purple/95 backdrop-blur-sm">
      <div className="flex w-full items-center justify-between py-1 pl-4 pr-6">
        <Link
          href="/"
          aria-label="Go to home"
          className="group rounded-md transition-transform duration-300 ease-out hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ll-purple"
        >
          <Image
            src="/LabLink-Logo_logo-White.svg"
            alt="LabLink logo"
            width={100}
            height={100}
            priority
            className="transition-opacity duration-300 group-hover:opacity-95"
          />
        </Link>
        {user && !user.is_anonymous ? (
          <form action={signOut}>
            <button
              type="submit"
              aria-label="Sign out"
              className="group flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/10 text-white transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/20 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ll-purple"
            >
              <CircleUserRound
                aria-hidden="true"
                size={24}
                strokeWidth={1.8}
                className="transition-transform duration-300 group-hover:scale-105"
              />
            </button>
          </form>
        ) : null}
      </div>
    </header>
  );
}
