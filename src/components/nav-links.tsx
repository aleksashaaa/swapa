"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Heart, MessageCircle, User, Compass } from "lucide-react";

const LINKS = [
  { href: "/discover", label: "Discover", Icon: Compass },
  { href: "/matches", label: "Matches", Icon: Heart },
  { href: "/chats", label: "Chats", Icon: MessageCircle },
  { href: "/profile", label: "Profile", Icon: User },
] as const;

export function NavLinks() {
  const path = usePathname();
  return (
    <nav className="hidden items-center gap-1 text-sm md:flex">
      {LINKS.map(({ href, label, Icon }) => {
        const active = path === href || path.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-medium transition ${
              active ? "bg-graphite text-cream" : "text-ink-soft hover:bg-sage/60 hover:text-ink"
            }`}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav() {
  const path = usePathname();
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-cream/95 px-2 pt-1.5 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around">
        {LINKS.map(({ href, label, Icon }) => {
          const active = path === href || path.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex min-w-16 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-medium transition ${
                active ? "text-sage-dark" : "text-ink-soft"
              }`}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function NotificationLink({ unread = 0 }: { unread?: number }) {
  return (
    <Link
      href="/notifications"
      aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
      className="relative grid size-10 place-items-center rounded-full border border-line bg-white/70 text-ink transition hover:border-sage-dark hover:bg-sage/40"
    >
      <Bell className="size-4" aria-hidden />
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-sage-dark px-1 text-[10px] font-semibold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
