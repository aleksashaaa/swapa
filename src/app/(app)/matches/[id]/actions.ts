"use server";

import { revalidatePath } from "next/cache";
import { requireOnboarded } from "@/lib/session";
import { track } from "@/lib/track";
import type { Message } from "@/lib/types";

export type ChatMessage = Message & { image_signed: string | null };
export type ChatState = { error?: string; message?: string };
export type ChatLoadResult = { messages?: ChatMessage[]; error?: string };
export type ActionResult = { error?: string; message?: string };

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

async function signChatImages(
  supabase: Awaited<ReturnType<typeof requireOnboarded>>["supabase"],
  messages: Message[],
) {
  const paths = messages.map((m) => m.image_url).filter((x): x is string => Boolean(x));
  if (!paths.length) return messages.map((m) => ({ ...m, image_signed: null }));

  const { data } = await supabase.storage.from("chat-images").createSignedUrls(paths, 60 * 60);
  const map = new Map<string, string>();
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) map.set(item.path, item.signedUrl);
  }

  return messages.map((m) => ({
    ...m,
    image_signed: m.image_url ? map.get(m.image_url) ?? null : null,
  }));
}

export async function loadMessages(matchId: string): Promise<ChatLoadResult> {
  const session = await requireOnboarded();

  const { data: match } = await session.supabase
    .from("matches")
    .select("id")
    .eq("id", matchId)
    .maybeSingle();
  if (!match) return { error: "Conversation not found." };

  const { data, error } = await session.supabase
    .from("messages")
    .select("id, match_id, sender_id, body, image_url, created_at")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) return { error: error.message };

  return { messages: await signChatImages(session.supabase, (data ?? []) as Message[]) };
}

export async function sendMessage(_prev: ChatState, formData: FormData): Promise<ChatState> {
  const session = await requireOnboarded();
  const matchId = str(formData, "match_id");
  const body = str(formData, "body");
  const imagePath = str(formData, "image_path");

  if (!matchId) return { error: "Missing conversation." };
  if (body.length > 2000) return { error: "Messages must be 2000 characters or fewer." };
  if (!body && !imagePath) return { error: "Write a message first." };
  if (imagePath && !imagePath.startsWith(`${matchId}/${session.userId}/`)) {
    return { error: "That image could not be verified." };
  }

  const { error } = await session.supabase.from("messages").insert({
    match_id: matchId,
    sender_id: session.userId,
    body: body || "Photo",
    image_url: imagePath || null,
  });

  if (error) {
    return {
      error:
        "This conversation is closed. You can still read it, but new messages cannot be sent.",
    };
  }

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/chats");
  return {};
}

function revalidateExchange(matchId: string) {
  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/matches");
  revalidatePath("/chats");
  revalidatePath("/profile");
  revalidatePath("/profile/exchanges");
}

export async function agreeExchange(matchId: string): Promise<ActionResult> {
  const session = await requireOnboarded();
  const { data, error } = await session.supabase.rpc("agree_to_exchange", { p_match_id: matchId });
  if (error) return { error: error.message };
  const result = data as { error?: string; status?: string } | null;
  if (result?.error) return { error: result.error };

  await track(session.supabase, session.userId, "exchange_agreed", {
    match_id: matchId,
    both_agreed: result?.status === "agreed",
  });
  revalidateExchange(matchId);
  return {};
}

export async function completeExchange(matchId: string): Promise<ActionResult> {
  const session = await requireOnboarded();
  const { data, error } = await session.supabase.rpc("complete_exchange", {
    p_match_id: matchId,
  });
  if (error) return { error: error.message };
  const result = data as { error?: string; status?: string } | null;
  if (result?.error) return { error: result.error };

  await track(session.supabase, session.userId, "exchange_completed", {
    match_id: matchId,
    both_completed: result?.status === "completed",
  });
  revalidateExchange(matchId);
  return {};
}

export async function cancelExchange(matchId: string): Promise<ActionResult> {
  const session = await requireOnboarded();
  const { data, error } = await session.supabase.rpc("cancel_exchange", {
    p_match_id: matchId,
  });
  if (error) return { error: error.message };
  const result = data as { error?: string } | null;
  if (result?.error) return { error: result.error };

  await track(session.supabase, session.userId, "exchange_cancelled", { match_id: matchId });
  revalidateExchange(matchId);
  return {};
}

export async function submitReview(_prev: ChatState, formData: FormData): Promise<ActionResult> {
  const session = await requireOnboarded();
  const matchId = str(formData, "match_id");
  const rating = Number.parseInt(str(formData, "rating"), 10);
  const body = str(formData, "body");

  if (!matchId) return { error: "Missing exchange." };
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return { error: "Choose a rating between 1 and 5." };
  }
  if (body.length > 1000) return { error: "Reviews must be 1000 characters or fewer." };

  const { data, error } = await session.supabase.rpc("submit_review", {
    p_match_id: matchId,
    p_rating: rating,
    p_body: body,
  });
  if (error) return { error: error.message };
  const result = data as { error?: string; ok?: boolean } | null;
  if (result?.error) return { error: result.error };

  await track(session.supabase, session.userId, "review_submitted", {
    match_id: matchId,
    rating,
  });
  revalidateExchange(matchId);
  revalidatePath("/profile/reviews");
  return { message: "Thank you. Your review has been published." };
}
