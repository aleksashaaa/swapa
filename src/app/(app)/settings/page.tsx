import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireOnboarded } from "@/lib/session";
import { getPublicProfile } from "@/lib/data";
import { SettingsClient } from "./settings-client";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await requireOnboarded();
  const [profile, { data: prefs }, { data: blocks }] = await Promise.all([
    getPublicProfile(session.supabase, session.userId),
    session.supabase
      .from("notification_preferences")
      .select("new_match, new_message, exchange_agreed, exchange_completed, new_review, item_status")
      .eq("user_id", session.userId)
      .maybeSingle(),
    session.supabase
      .from("user_blocks")
      .select(
        "blocked_id, blocked:profiles!user_blocks_blocked_id_fkey(id, full_name, avatar_url, city)",
      )
      .eq("blocker_id", session.userId)
      .order("created_at", { ascending: false }),
  ]);

  if (!profile) return null;

  const blocked = ((blocks ?? []) as unknown as {
    blocked: { id: string; full_name: string; avatar_url: string | null; city: string } | null;
  }[])
    .map((row) => row.blocked)
    .filter((person): person is { id: string; full_name: string; avatar_url: string | null; city: string } => Boolean(person));

  return (
    <main className="mx-auto max-w-3xl px-5 pb-24 pt-8">
      <Link href="/profile" className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="size-3.5" aria-hidden /> Profile
      </Link>
      <p className="eyebrow mt-6">Settings</p>
      <h1 className="mt-3 font-display text-[clamp(2.3rem,5vw,3.8rem)] leading-[0.95] tracking-tight">
        Your account, <em className="italic text-sage-dark">your rules.</em>
      </h1>
      <p className="mt-3 max-w-xl text-ink-soft">
        Control notifications, public details and the people you&apos;ve blocked.
      </p>

      <SettingsClient
        profile={profile}
        email={session.email}
        blocked={blocked}
        prefs={{
          new_match: prefs?.new_match ?? true,
          new_message: prefs?.new_message ?? true,
          exchange_agreed: prefs?.exchange_agreed ?? true,
          exchange_completed: prefs?.exchange_completed ?? true,
          new_review: prefs?.new_review ?? true,
          item_status: prefs?.item_status ?? true,
        }}
      />
    </main>
  );
}
