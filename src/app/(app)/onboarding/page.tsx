import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { OnboardingWizard } from "./wizard";

export const metadata: Metadata = { title: "Welcome to SWAPA" };

export default async function OnboardingPage() {
  const session = await requireSession();
  if (session.onboardingCompleted) redirect("/discover");

  const { data: profile } = await session.supabase
    .from("profiles")
    .select("full_name, city, bio, avatar_url, interests")
    .eq("id", session.userId)
    .single();

  return (
    <main className="mx-auto max-w-6xl px-5 pb-24 pt-10">
      <OnboardingWizard
        userId={session.userId}
        fullName={profile?.full_name ?? session.fullName}
        city={profile?.city ?? ""}
        bio={profile?.bio ?? ""}
        avatarUrl={profile?.avatar_url ?? null}
        interests={profile?.interests ?? []}
      />
    </main>
  );
}
