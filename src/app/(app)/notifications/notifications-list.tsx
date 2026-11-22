"use client";

import Link from "next/link";
import { useTransition } from "react";
import {
  ArrowRight,
  Bell,
  Check,
  CheckCheck,
  Heart,
  MessageCircle,
  Package,
  Star,
  Handshake,
  CheckCircle2,
} from "lucide-react";
import { timeAgo } from "@/lib/format";
import type { Notification, NotificationType } from "@/lib/types";
import { markAllNotificationsRead, markNotificationRead } from "@/app/(app)/profile/actions";

const META: Record<
  NotificationType,
  { label: string; Icon: typeof Bell; href: (n: Notification) => string }
> = {
  match: {
    label: "New match",
    Icon: Heart,
    href: (n) => (n.payload.match_id ? `/matches/${n.payload.match_id}` : "/matches"),
  },
  message: {
    label: "New message",
    Icon: MessageCircle,
    href: (n) => (n.payload.match_id ? `/matches/${n.payload.match_id}` : "/chats"),
  },
  exchange_agreed: {
    label: "Exchange agreed",
    Icon: Handshake,
    href: (n) => (n.payload.match_id ? `/matches/${n.payload.match_id}` : "/profile/exchanges"),
  },
  exchange_completed: {
    label: "Exchange completed",
    Icon: CheckCircle2,
    href: (n) => (n.payload.match_id ? `/matches/${n.payload.match_id}` : "/profile/exchanges"),
  },
  review: {
    label: "New review",
    Icon: Star,
    href: (n) => (n.payload.match_id ? `/matches/${n.payload.match_id}` : "/profile/reviews"),
  },
  item_status: {
    label: "Item update",
    Icon: Package,
    href: () => "/profile/items",
  },
};

export function NotificationsList({ notifications }: { notifications: Notification[] }) {
  const [pending, startTransition] = useTransition();
  const unread = notifications.filter((n) => !n.read_at).length;

  if (!notifications.length) {
    return (
      <div className="mt-8 rounded-[26px] border-2 border-dashed border-sage-dark/35 bg-white/55 p-10 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-sage text-sage-dark">
          <Bell className="size-6" aria-hidden />
        </div>
        <h2 className="mt-5 font-display text-3xl">You&apos;re all caught up.</h2>
        <p className="mx-auto mt-3 max-w-md text-ink-soft">
          Matches, messages, exchange updates and reviews will appear here. You can control each type
          in Settings.
        </p>
        <Link href="/discover" className="btn-primary mt-6 px-6 py-3">
          Discover items <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">
          {unread ? `${unread} unread` : "Everything is read"}
        </p>
        <button
          type="button"
          disabled={pending || unread === 0}
          onClick={() => startTransition(async () => { await markAllNotificationsRead(); })}
          className="btn-secondary px-4 py-2 text-sm"
        >
          <CheckCheck className="size-4" aria-hidden /> Mark all as read
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {notifications.map((notification) => {
          const meta = META[notification.type];
          const Icon = meta.Icon;
          return (
            <article
              key={notification.id}
              className={`flex items-start gap-3 rounded-[20px] border p-4 transition ${
                notification.read_at ? "border-line bg-white/55" : "border-sage-dark/30 bg-sage/25"
              }`}
            >
              <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full bg-white text-sage-dark">
                <Icon className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{meta.label}</p>
                  {!notification.read_at && (
                    <span className="rounded-full bg-sage-dark px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      New
                    </span>
                  )}
                  <span className="text-[11px] text-ink-soft">{timeAgo(notification.created_at)}</span>
                </div>
                <p className="mt-1 text-sm text-ink-soft">{describe(notification)}</p>
                <Link
                  href={meta.href(notification)}
                  className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-sage-dark hover:text-ink"
                >
                  Open <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </div>
              {!notification.read_at && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => startTransition(async () => { await markNotificationRead(notification.id); })}
                  className="grid size-8 shrink-0 place-items-center rounded-full border border-line bg-white text-ink-soft transition hover:border-sage-dark hover:text-ink"
                  aria-label="Mark as read"
                >
                  <Check className="size-4" aria-hidden />
                </button>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function describe(notification: Notification) {
  const payload = notification.payload ?? {};
  switch (notification.type) {
    case "match":
      return "You both liked each other's items. Open the match to say hello.";
    case "message":
      return "Someone sent you a message about an exchange.";
    case "exchange_agreed":
      return "Both people agreed. The items are now reserved for this swap.";
    case "exchange_completed":
      return "Both people confirmed the swap. The exchange is complete.";
    case "review":
      return payload.rating ? `You received a ${payload.rating}-star review.` : "You received a new review.";
    case "item_status":
      return payload.status
        ? `Your item is now marked ${String(payload.status).replaceAll("_", " ")}.`
        : "An item status changed.";
    default:
      return "You have a new notification.";
  }
}
