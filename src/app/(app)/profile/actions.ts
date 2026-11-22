"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOnboarded } from "@/lib/session";
import { track } from "@/lib/track";
import { REPORT_REASONS } from "@/lib/constants";
import type { ReportTarget } from "@/lib/types";

export type FormState = { error?: string; message?: string };

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const bool = (f: FormData, k: string) => f.get(k) === "on" || f.get(k) === "true";

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireOnboarded();
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

  if (fullName.length < 2 || fullName.length > 80) return { error: "Name must be 2–80 characters." };
  if (city.length < 2 || city.length > 80) return { error: "Please enter your city." };
  if (bio.length > 500) return { error: "Bio must be 500 characters or fewer." };

  if (avatarUrl) {
    const expected = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${session.userId}/`;
    if (!avatarUrl.startsWith(expected)) return { error: "That profile photo could not be verified." };
  }

  const { error } = await session.supabase
    .from("profiles")
    .update({
      full_name: fullName,
      city,
      bio,
      interests,
      avatar_url: avatarUrl || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.userId);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  revalidatePath(`/users/${session.userId}`);
  redirect("/profile?saved=1");
}

export async function updatePrivacy(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireOnboarded();
  const { error } = await session.supabase
    .from("profiles")
    .update({
      show_city: bool(formData, "show_city"),
      show_rating: bool(formData, "show_rating"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.userId);
  if (error) return { error: error.message };
  revalidatePath("/settings");
  revalidatePath(`/users/${session.userId}`);
  return { message: "Privacy settings saved." };
}

export async function updateNotificationPreferences(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireOnboarded();
  const { error } = await session.supabase
    .from("notification_preferences")
    .update({
      new_match: bool(formData, "new_match"),
      new_message: bool(formData, "new_message"),
      exchange_agreed: bool(formData, "exchange_agreed"),
      exchange_completed: bool(formData, "exchange_completed"),
      new_review: bool(formData, "new_review"),
      item_status: bool(formData, "item_status"),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", session.userId);
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { message: "Notification preferences saved." };
}

export async function blockUser(userId: string) {
  const session = await requireOnboarded();
  if (userId === session.userId) return { error: "You cannot block yourself." };
  const { data, error } = await session.supabase.rpc("block_user", { p_user_id: userId });
  if (error) return { error: error.message };
  const result = data as { error?: string; ok?: boolean } | null;
  if (result?.error) return { error: result.error };

  await track(session.supabase, session.userId, "user_blocked", { blocked_id: userId });
  revalidatePath("/settings");
  revalidatePath(`/users/${userId}`);
  revalidatePath("/matches");
  revalidatePath("/chats");
  revalidatePath("/discover");
  return {};
}

export async function unblockUser(userId: string) {
  const session = await requireOnboarded();
  const { error } = await session.supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_id", session.userId)
    .eq("blocked_id", userId);
  if (error) return { error: error.message };
  revalidatePath("/settings");
  revalidatePath(`/users/${userId}`);
  return {};
}

export async function submitReport(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireOnboarded();
  const targetType = str(formData, "target_type") as ReportTarget;
  const targetId = str(formData, "target_id");
  const reason = str(formData, "reason");
  const details = str(formData, "details");

  if (!["user", "item", "message", "review"].includes(targetType)) {
    return { error: "Invalid report type." };
  }
  if (!targetId) return { error: "Missing report target." };
  if (!(REPORT_REASONS as readonly string[]).includes(reason)) return { error: "Choose a reason." };
  if (details.length > 1000) return { error: "Details must be 1000 characters or fewer." };

  const { error } = await session.supabase.from("reports").insert({
    reporter_id: session.userId,
    target_type: targetType,
    target_id: targetId,
    reason,
    details,
  });
  if (error) return { error: error.message };

  await track(session.supabase, session.userId, "report_submitted", {
    target_type: targetType,
    target_id: targetId,
    reason,
  });
  return { message: "Thank you. Your report has been saved for moderation." };
}

export async function markNotificationRead(id: string) {
  const session = await requireOnboarded();
  await session.supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", session.userId);
  revalidatePath("/notifications");
}

export async function markAllNotificationsRead() {
  const session = await requireOnboarded();
  await session.supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", session.userId)
    .is("read_at", null);
  revalidatePath("/notifications");
}

export async function updateReportStatus(reportId: string, status: string) {
  const session = await requireOnboarded();
  if (!session.isAdmin) return { error: "Admins only." };
  if (!["open", "reviewing", "resolved", "dismissed"].includes(status)) {
    return { error: "Invalid status." };
  }
  const { error } = await session.supabase
    .from("reports")
    .update({ status })
    .eq("id", reportId);
  if (error) return { error: error.message };
  revalidatePath("/admin/reports");
  return {};
}
