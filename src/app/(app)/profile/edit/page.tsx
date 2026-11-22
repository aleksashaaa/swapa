import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireOnboarded } from "@/lib/session";
import { getPublicProfile } from "@/lib/data";
import { ProfileForm } from "../profile-form";
import { updateProfile } from "../actions";

export const metadata: Metadata = { title: "Edit profile" };

export default async function EditProfilePage() {
  const session = await requireOnboarded();
  const profile = await getPublicProfile(session.supabase, session.userId);
  if (!profile) return null;

  return (
    <main className="mx-auto max-w-3xl px-5 pb-24 pt-8">
      <Link href="/profile" className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="size-3.5" aria-hidden /> Profile
      </Link>
      <p className="eyebrow mt-6">Edit profile</p>
      <h1 className="mt-3 font-display text-[clamp(2.3rem,5vw,3.8rem)] leading-[0.95] tracking-tight">
        Make it feel like <em className="italic text-sage-dark">you.</em>
      </h1>
      <p className="mt-4 max-w-xl text-ink-soft">
        Your email and exact address are never shown. Only the public details below are visible.
      </p>
      <div className="mt-8">
        <ProfileForm action={updateProfile} userId={session.userId} profile={profile} />
      </div>
    </main>
  );
}
