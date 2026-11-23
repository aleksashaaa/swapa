"use client";

import { createBrowserClient } from "@supabase/ssr";
import { createDemoClient, DEMO } from "./demo";

export function createClient() {
  if (DEMO) return createDemoClient();
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
