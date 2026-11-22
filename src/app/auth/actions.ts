"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { track } from "@/lib/track";

export type SafeRedirectUrl = string;

function safeNext(raw: string): SafeRedirectUrl {
  if (!raw) return "/discover";
  try {
    const url = new URL(raw, "http://localhost");
    if (url.hostname !== "localhost") return "/discover";
  } catch {
    // relative path is fine
  }
  if (!raw.startsWith("/")) return "/discover";
  if (raw.startsWith("//")) return "/discover";
  return raw;
}

export type AuthState = {
  error?: string;
  message?: string;
  fields?: { email?: string; fullName?: string };
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const fields = { email, fullName };

  if (fullName.length < 2)
    return { error: "Please enter your full name (at least 2 characters).", fields };
  if (!EMAIL_RE.test(email))
    return { error: "Please enter a valid email address.", fields };
  if (password.length < 8)
    return { error: "Password must be at least 8 characters.", fields };

  const supabase = await createClient();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${origin}/auth/callback?next=/onboarding`,
    },
  });

  if (error) return { error: error.message, fields };

  if (!data.session) {
    return {
      message: `We've sent a confirmation link to ${email}. Please check your inbox.`,
      fields,
    };
  }

  if (data.user) {
    await track(supabase, data.user.id, "signup_completed", { method: "email" });
  }

  redirect("/onboarding");
}

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""));

  if (!EMAIL_RE.test(email) || !password) {
    return {
      error: "Please enter your email and password.",
      fields: { email },
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error)
    return {
      error: "Incorrect email or password. Please try again.",
      fields: { email },
    };

  if (data.user) {
    await track(supabase, data.user.id, "login_completed", { method: "email" });
  }

  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
