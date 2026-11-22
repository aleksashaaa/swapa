"use client";

import posthog from "posthog-js";
import { useEffect } from "react";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

function ensureInit() {
  if (!KEY || posthog.__loaded) return Boolean(KEY);
  posthog.init(KEY, {
    api_host: "/ingest",
    ui_host: "https://eu.posthog.com",
    defaults: "2025-05-24",
    person_profiles: "identified_only",
    session_recording: { maskAllInputs: true },
  });
  return true;
}

export function AnalyticsProvider({ userId }: { userId?: string | null }) {
  useEffect(() => {
    if (!ensureInit()) return;
    if (userId) posthog.identify(userId);
  }, [userId]);
  return null;
}

export function captureClient(event: string, properties: Record<string, unknown> = {}) {
  if (!ensureInit()) return;
  try {
    posthog.capture(event, properties);
  } catch {
    // analytics must never break the page
  }
}
