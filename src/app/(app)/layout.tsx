import Link from "next/link";
import { Plus } from "lucide-react";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { Logo } from "@/components/logo";
import { MobileNav, NavLinks, NotificationLink } from "@/components/nav-links";
import { signOut } from "@/app/auth/actions";
import { requireSession } from "@/lib/session";
import { initials } from "@/lib/format";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const { data: unreadRows } = await session.supabase
    .from("notifications")
    .select("id")
    .eq("user_id", session.userId)
    .is("read_at", null)
    .limit(99);
  const unread = unreadRows?.length ?? 0;

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <AnalyticsProvider userId={session.userId} />
      <header className="sticky top-0 z-40 border-b border-line bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-6">
            <Logo />
            <NavLinks />
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/profile/items/new"
              className="hidden items-center gap-1.5 rounded-full bg-sage px-4 py-2 text-sm font-semibold text-graphite transition hover:bg-sage-dark hover:text-white sm:inline-flex"
            >
              <Plus className="size-4" aria-hidden /> Add item
            </Link>
            <NotificationLink unread={unread} />
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-full border border-line bg-white/70 py-1 pl-1 pr-3 transition hover:border-sage-dark"
              aria-label="Open profile"
            >
              {session.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.avatarUrl}
                  alt=""
                  className="size-8 rounded-full object-cover"
                />
              ) : (
                <span className="grid size-8 place-items-center rounded-full bg-sage-dark text-xs font-semibold text-white">
                  {initials(session.fullName)}
                </span>
              )}
              <span className="hidden max-w-28 truncate text-sm font-medium sm:block">
                {session.fullName.split(" ")[0]}
              </span>
            </Link>
            <form action={signOut} className="hidden md:block">
              <button className="rounded-full px-3 py-2 text-sm text-ink-soft transition hover:bg-sage/60 hover:text-ink">
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>

      {children}
      <MobileNav />
    </div>
  );
}
