import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type ProfileRow = {
  role: "student" | "professor";
  onboarding_complete: boolean;
};

export default async function PostLoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,onboarding_complete")
    .eq("id", user.id)
    .single<ProfileRow>();

  if (!profile) {
    redirect("/");
  }

  if (!profile.onboarding_complete) {
    redirect(`/onboarding/${profile.role}`);
  }

  redirect(`/dashboard/${profile.role}`);
}
