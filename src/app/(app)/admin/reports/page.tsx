import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireOnboarded } from "@/lib/session";
import { ReportsClient } from "./reports-client";

export const metadata: Metadata = { title: "Moderation" };

export default async function AdminReportsPage() {
  const session = await requireOnboarded();
  if (!session.isAdmin) redirect("/discover");

  const { data } = await session.supabase
    .from("reports")
    .select(
      "id, target_type, target_id, reason, details, status, created_at, reporter:profiles!reports_reporter_id_fkey(full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="mx-auto max-w-4xl px-5 pb-24 pt-8">
      <p className="eyebrow">Moderation</p>
      <h1 className="mt-3 font-display text-[clamp(2.3rem,5vw,3.8rem)] leading-[0.95] tracking-tight">
        Keep SWAPA <em className="italic text-sage-dark">safe.</em>
      </h1>
      <p className="mt-3 max-w-xl text-ink-soft">
        Review member reports and update their status. Only admins can see this page.
      </p>
      <ReportsClient
        reports={(data ?? []) as unknown as {
          id: string;
          target_type: string;
          target_id: string;
          reason: string;
          details: string;
          status: string;
          created_at: string;
          reporter: { full_name: string } | null;
        }[]}
      />
    </main>
  );
}
