"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignInForm() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push("/auth/post-login");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-semibold uppercase tracking-wider text-ll-gray">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="first.last@university.edu"
          className="w-full rounded-md border border-zinc-200 bg-zinc-100 px-4 py-3 text-base transition-all duration-200 outline-none placeholder:text-zinc-400 hover:border-zinc-300 focus:border-ll-purple focus:bg-white focus:shadow-[0_0_0_3px_rgba(197,147,238,0.2)]"
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="block text-sm font-semibold uppercase tracking-wider text-ll-gray">
            Password
          </label>
          <button type="button" className="text-xs font-semibold text-ll-gray">
            Forgot password?
          </button>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="w-full rounded-md border border-zinc-200 bg-zinc-100 px-4 py-3 text-base transition-all duration-200 outline-none hover:border-zinc-300 focus:border-ll-purple focus:bg-white focus:shadow-[0_0_0_3px_rgba(197,147,238,0.2)]"
        />
      </div>

      {error ? <p className="text-base text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-ll-purple px-4 py-3 text-sm font-semibold uppercase tracking-wider text-white transition-all duration-300 hover:-translate-y-0.5 hover:brightness-105 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ll-purple focus-visible:ring-offset-2 disabled:opacity-60"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>

      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-zinc-200" />
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">or</span>
        <div className="h-px flex-1 bg-zinc-200" />
      </div>

      <button
        type="button"
        onClick={() => {
          const role = searchParams.get("role");
          const href = role ? `/auth/sign-up?role=${role}` : "/auth/sign-up";
          router.push(href);
        }}
        className="w-full rounded-md border border-zinc-200 bg-zinc-100 px-4 py-3 text-sm font-semibold uppercase tracking-wider text-zinc-700 transition-all duration-300 hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ll-purple focus-visible:ring-offset-2"
      >
        Sign up
      </button>

    </form>
  );
}
