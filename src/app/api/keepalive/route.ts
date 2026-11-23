import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Called daily by the cron in vercel.json (or any scheduler) so a free
// Supabase project does not get paused for inactivity.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("profiles").select("id", { head: true, count: "exact" }).limit(1);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
