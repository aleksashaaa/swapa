"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { track } from "@/lib/track";

export type OnboardingState = { error?: string };

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function saveOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const { supabase, userId } = await requireSession();

  const fullName = str(formData, "full_name");
  const city = str(formData, "city");
  const bio = str(formData, "bio");
  const avatarUrl = str(formData, "avatar_url");
  const interests = formData
    .getAll("interests")
    .map(String)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 12);

  if (fullName.length < 2 || fullName.length > 80) {
    return { error: "Please enter your name (2–80 characters)." };
  }
  if (city.length < 2 || city.length > 80) {
    return { error: "Please tell us which city you are in." };
  }
  if (bio.length > 500) {
    return { error: "Your bio must be 500 characters or fewer." };
  }

  if (avatarUrl) {
    const expected = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${userId}/`;
    if (!avatarUrl.startsWith(expected)) {
      return { error: "That profile photo could not be verified. Please upload it again." };
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      city,
      bio,
      interests,
      avatar_url: avatarUrl || null,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) return { error: error.message };

  await track(supabase, userId, "onboarding_completed", {
    interest_count: interests.length,
    has_avatar: Boolean(avatarUrl),
  });

  revalidatePath("/profile");
  redirect("/discover");
}
