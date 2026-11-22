"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2, Send } from "lucide-react";
import { initials, timeAgo } from "@/lib/format";
import { extensionFor, uploadImage } from "@/lib/upload";
import { loadMessages, sendMessage, type ChatMessage } from "./actions";

export function ChatPanel({
  matchId,
  userId,
  initialMessages,
  disabled,
  disabledReason,
}: {
  matchId: string;
  userId: string;
  initialMessages: ChatMessage[];
  disabled: boolean;
  disabledReason: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const bottom = useRef<HTMLDivElement | null>(null);

  const refresh = async () => {
    const result = await loadMessages(matchId);
    if (result.messages) setMessages(result.messages);
  };

  useEffect(() => {
    if (disabled) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, disabled]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = body.trim();
    if (!text || pending) return;
    setError(null);
    const form = new FormData();
    form.set("match_id", matchId);
    form.set("body", text);

    startTransition(async () => {
      const result = await sendMessage({}, form);
      if (result.error) {
        setError(result.error);
        return;
      }
      setBody("");
      await refresh();
    });
  };

  const attach = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const path = `${matchId}/${userId}/${crypto.randomUUID()}.${extensionFor(file)}`;
      await uploadImage({ bucket: "chat-images", path, file, maxMb: 5 });
      const form = new FormData();
      form.set("match_id", matchId);
      form.set("body", "");
      form.set("image_path", path);
      const result = await sendMessage({}, form);
      if (result.error) {
        setError(result.error);
        return;
      }
      await refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="flex min-h-[28rem] flex-col rounded-[24px] border border-line bg-white/75">
      <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <div>
          <p className="eyebrow">Conversation</p>
          <p className="mt-0.5 text-sm text-ink-soft">Messages refresh automatically.</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-ink-soft">
          <span className="size-2 rounded-full bg-sage-dark" aria-hidden /> Live
        </span>
      </header>

      <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-5" aria-live="polite">
        {messages.length === 0 ? (
          <p className="rounded-2xl bg-sage/30 p-4 text-center text-sm text-ink-soft">
            No messages yet. Say hello and agree on a safe meeting place.
          </p>
        ) : (
          messages.map((message) => {
            const mine = message.sender_id === userId;
            return (
              <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] ${mine ? "text-right" : "text-left"}`}>
                  <div
                    className={`inline-block rounded-2xl px-4 py-2.5 text-left text-sm leading-relaxed ${
                      mine ? "bg-sage-dark text-white" : "border border-line bg-cream text-ink"
                    }`}
                  >
                    {message.image_signed && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={message.image_signed}
                        alt="Shared in chat"
                        className="mb-2 max-h-72 w-full rounded-xl object-cover"
                      />
                    )}
                    {message.body && message.body !== "Photo" && <p className="whitespace-pre-wrap">{message.body}</p>}
                  </div>
                  <p className="mt-1 px-1 text-[10px] text-ink-soft">{timeAgo(message.created_at)}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottom} />
      </div>

      <div className="border-t border-line p-4">
        {error && (
          <p role="alert" className="mb-3 rounded-xl bg-[#F7E9E2] px-3 py-2 text-sm text-[#8B3D1F]">
            {error}
          </p>
        )}
        {disabled ? (
          <p className="rounded-xl bg-sage/30 px-4 py-3 text-center text-sm text-ink-soft">
            {disabledReason}
          </p>
        ) : (
          <form onSubmit={submit} className="flex items-end gap-2">
            <label className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border border-line bg-white text-ink-soft transition hover:border-sage-dark hover:text-ink">
              {uploading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ImagePlus className="size-4" aria-hidden />}
              <span className="sr-only">Attach a photo</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={uploading}
                onChange={(event) => void attach(event.target.files?.[0])}
              />
            </label>
            <label className="min-w-0 flex-1">
              <span className="sr-only">Message</span>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                rows={1}
                maxLength={2000}
                placeholder="Write a message…"
                className="field max-h-32 min-h-11 resize-y py-3"
              />
            </label>
            <button
              type="submit"
              disabled={pending || uploading || !body.trim()}
              className="grid size-11 shrink-0 place-items-center rounded-full bg-sage-dark text-white transition hover:bg-graphite disabled:opacity-40"
              aria-label="Send message"
            >
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
            </button>
          </form>
        )}
        <p className="mt-2 text-center text-[11px] text-ink-soft">
          Never share your address or payment details. SWAPA is always free.
        </p>
      </div>
    </section>
  );
}

export function ChatAvatar({
  name,
  avatarUrl,
  size = "size-10",
}: {
  name: string;
  avatarUrl: string | null;
  size?: string;
}) {
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-sage text-sage-dark ${size}`}>
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="size-full object-cover" />
      ) : (
        <span className="text-xs font-semibold">{initials(name)}</span>
      )}
    </span>
  );
}
