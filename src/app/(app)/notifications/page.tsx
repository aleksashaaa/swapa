import type { Metadata } from "next";
import { requireOnboarded } from "@/lib/session";
import type { Notification } from "@/lib/types";
import { NotificationsList } from "./notifications-list";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const session = await requireOnboarded();
  const { data } = await session.supabase
    .from("notifications")
    .select("id, user_id, type, payload, read_at, created_at")
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="mx-auto max-w-3xl px-5 pb-24 pt-8">
      <p className="eyebrow">Notifications</p>
      <h1 className="mt-3 font-display text-[clamp(2.3rem,5vw,3.8rem)] leading-[0.95] tracking-tight">
        What&apos;s <em className="italic text-sage-dark">new.</em>
      </h1>
      <p className="mt-3 max-w-xl text-ink-soft">
        Only the events you care about. Change which notifications you receive in Settings.
      </p>
      <NotificationsList notifications={(data ?? []) as Notification[]} />
    </main>
  );
}
