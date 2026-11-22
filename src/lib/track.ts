import type { SupabaseClient } from "@supabase/supabase-js";
import { captureServer } from "@/lib/analytics/server";

export type EventName =
  | "signup_completed"
  | "login_completed"
  | "onboarding_completed"
  | "item_created"
  | "item_published"
  | "item_updated"
  | "item_deleted"
  | "discover_opened"
  | "item_liked"
  | "item_skipped"
  | "match_created"
  | "chat_opened"
  | "exchange_agreed"
  | "exchange_completed"
  | "exchange_cancelled"
  | "review_submitted"
  | "user_blocked"
  | "report_submitted";

// Fire-and-forget analytics: never break a user action because analytics failed.
export async function track(
  supabase: SupabaseClient,
  userId: string,
  name: EventName,
  props: Record<string, unknown> = {},
) {
  try {
    await Promise.all([
      supabase.from("events").insert({ user_id: userId, name, props }),
      captureServer(userId, name, props),
    ]);
  } catch (error) {
    console.error("track failed", name, error);
  }
}
