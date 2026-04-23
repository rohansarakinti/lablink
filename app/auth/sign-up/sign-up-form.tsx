"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignUpForm({ role }: { role: "student" | "professor" }) {
  const supabase = createClient();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    router.push("/auth/sign-in");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="role" value={role} />
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
          className="w-full rounded-md border bg-zinc-200 px-4 py-3 text-base"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-semibold uppercase tracking-wider text-ll-gray">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          minLength={8}
          required
          className="w-full rounded-md border bg-zinc-200 px-4 py-3 text-base"
        />
      </div>

      {error ? <p className="text-base text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-ll-purple px-4 py-3 text-sm font-semibold uppercase tracking-wider text-white disabled:opacity-60"
      >
        {loading ? "Creating account..." : "Create account"}
      </button>

      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-zinc-200" />
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">or</span>
        <div className="h-px flex-1 bg-zinc-200" />
      </div>

      <button
        type="button"
        onClick={() => router.push(`/auth/sign-in?role=${role}`)}
        className="w-full rounded-md border border-zinc-200 bg-zinc-100 px-4 py-3 text-sm font-semibold uppercase tracking-wider text-zinc-700"
      >
        Sign in
      </button>

    </form>
  );
}
