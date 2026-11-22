import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type Session = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  city: string;
  isAdmin: boolean;
  onboardingCompleted: boolean;
};

// Signed-in user with profile. Redirects to /login when signed out.
export const requireSession = cache(async (): Promise<Session> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, city, is_admin, onboarding_completed")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login?error=profile");

  return {
    supabase,
    userId: user.id,
    email: user.email ?? "",
    fullName: profile.full_name,
    avatarUrl: profile.avatar_url ?? null,
    city: profile.city ?? "",
    isAdmin: Boolean(profile.is_admin),
    onboardingCompleted: Boolean(profile.onboarding_completed),
  };
});

export async function requireOnboarded() {
  const session = await requireSession();
  if (!session.onboardingCompleted) redirect("/onboarding");
  return session;
}
