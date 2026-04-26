import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type ProfileRow = {
  role: "student" | "professor";
  onboarding_complete: boolean;
};

function resolveRoleFromMetadata(
  value: unknown,
): "student" | "professor" {
  return value === "professor" ? "professor" : "student";
}

export default async function PostLoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("role,onboarding_complete")
    .eq("id", user.id)
    .single<ProfileRow>();

  let profile = existingProfile;

  if (!profile) {
    const role = resolveRoleFromMetadata(user.user_metadata?.role);

    const { data: insertedProfile } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          role,
          email: user.email ?? null,
          display_name: user.user_metadata?.full_name ?? null,
        },
        { onConflict: "id" },
      )
      .select("role,onboarding_complete")
      .single<ProfileRow>();

    profile = insertedProfile;
  }

  if (!profile) {
    redirect("/auth/sign-in");
  }

  if (!profile.onboarding_complete) {
    redirect(`/onboarding/${profile.role}`);
  }

  redirect(`/dashboard/${profile.role}`);
}
