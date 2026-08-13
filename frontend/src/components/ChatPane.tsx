"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api, resolveUrl } from "@/lib/api";
import { dayLabel, formatTime } from "@/lib/format";
import type { ChatMessage, Conversation, User } from "@/lib/types";
import { useChat } from "@/store/chat";
import { useUi } from "@/store/ui";
import { Avatar } from "./Avatar";
import { IconButton, subtitleFor } from "./ConversationList";
import { Icon, icons } from "./Icons";
import { Composer } from "./Composer";

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

export function ChatPane({
  convo,
  self,
  onTyping,
}: {
  convo: Conversation;
  self: User;
  onTyping: (typing: boolean) => void;
}) {
  const messages = useChat((s) => s.messages[convo.id] ?? []);
  const typing = useChat((s) => s.typing[convo.id] ?? []);
  const loadMessages = useChat((s) => s.loadMessages);
  const setInfoOpen = useUi((s) => s.setInfoOpen);
  const setMobileShowChat = useUi((s) => s.setMobileShowChat);
  const infoOpen = useUi((s) => s.infoOpen);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [reply, setReply] = useState<ChatMessage | null>(null);

  useEffect(() => {
    void loadMessages(convo.id);
  }, [convo.id, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, typing.length]);

  const grouped = useMemo(() => {
    const days: { label: string; items: ChatMessage[] }[] = [];
    for (const msg of messages) {
      const label = dayLabel(msg.created_at);
      const last = days.at(-1);
      if (!last || last.label !== label) days.push({ label, items: [msg] });
      else last.items.push(msg);
    }
    return days;
  }, [messages]);

  const name = convo.type === "dm" ? convo.other_user?.display_name ?? convo.name : convo.name;

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-[var(--bg-chat)]">
      <header className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-header)] px-3 py-2">
        <button
          type="button"
          className="rounded-full p-1 text-[var(--text-muted)] md:hidden"
          onClick={() => setMobileShowChat(false)}
        >
          <Icon d={icons.chevron} />
        </button>
        <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setInfoOpen(!infoOpen)}>
          <Avatar name={name || "Chat"} src={convo.avatar_url} id={convo.other_user?.id || convo.id} size={36} />
          <div className="min-w-0">
            <div className="truncate font-medium">{name}</div>
            <div className="truncate text-xs text-[var(--text-muted)]">{subtitleFor(convo)}</div>
          </div>
        </button>
        <IconButton title="Voice call" onClick={() => useUi.getState().openModal("coming-soon", "Voice calls")}>
          <Icon d={icons.phone} size={18} />
        </IconButton>
        <IconButton title="Info" onClick={() => setInfoOpen(!infoOpen)} active={infoOpen}>
          <Icon d={icons.more} size={18} />
        </IconButton>
      </header>

      <div className="chat-pattern min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {grouped.map((group) => (
          <div key={group.label}>
            <div className="sticky top-2 z-10 mb-3 flex justify-center">
              <span className="rounded-full bg-black/30 px-3 py-1 text-[11px] text-white backdrop-blur">
                {group.label}
              </span>
            </div>
            {group.items.map((msg) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                mine={msg.sender_id === self.id}
                group={convo.type === "group"}
                onReply={() => setReply(msg)}
              />
            ))}
          </div>
        ))}
        {typing.length ? (
          <p className="px-2 py-1 text-xs text-[var(--text-muted)]">
            {typing.map((t) => t.display_name).join(", ")} typing…
          </p>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <Composer convoId={convo.id} self={self} reply={reply} onClearReply={() => setReply(null)} onTyping={onTyping} />
    </div>
  );
}

function MessageBubble({
  msg,
  mine,
  group,
  onReply,
}: {
  msg: ChatMessage;
  mine: boolean;
  group: boolean;
  onReply: () => void;
}) {
  const [hover, setHover] = useState(false);

  return (
    <div
      className={`mb-1 flex ${mine ? "justify-end" : "justify-start"}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className={`max-w-[min(72%,520px)] ${mine ? "items-end" : "items-start"} relative`}>
        {group && !mine ? (
          <div className="mb-0.5 pl-1 text-[11px] text-[var(--text-muted)]">{msg.sender_name}</div>
        ) : null}
        <div
          className={`rounded-2xl px-3 py-1.5 text-[14.5px] leading-snug shadow-sm ${
            mine ? "rounded-br-md bg-signal-2 text-white" : "rounded-bl-md bg-[var(--bg-incoming)]"
          }`}
        >
          {msg.reply_to ? (
            <div className={`mb-1 border-l-2 pl-2 text-xs opacity-80 ${mine ? "border-white/70" : "border-signal"}`}>
              <div className="font-medium">{msg.reply_to.sender_name}</div>
              <div className="truncate">{msg.reply_to.body || msg.reply_to.attachment_name}</div>
            </div>
          ) : null}
          {msg.attachment_url && msg.attachment_type?.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resolveUrl(msg.attachment_url) ?? ""} alt="" className="mb-1 max-h-64 rounded-xl" />
          ) : msg.attachment_url ? (
            <a href={resolveUrl(msg.attachment_url) ?? msg.attachment_url} className="mb-1 block underline" target="_blank" rel="noreferrer">
              {msg.attachment_name}
            </a>
          ) : null}
          {msg.body ? <span className="whitespace-pre-wrap">{msg.body}</span> : null}
          <div className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${mine ? "text-white/75" : "text-[var(--text-muted)]"}`}>
            <span>{formatTime(msg.created_at)}</span>
            {mine ? <Ticks status={msg.status} /> : null}
          </div>
        </div>
        {msg.reactions.length ? (
          <div className={`mt-0.5 flex gap-1 ${mine ? "justify-end" : ""}`}>
            {msg.reactions.map((r) => (
              <button
                key={r.emoji}
                type="button"
                onClick={() => void api.react(msg.id, r.emoji)}
                className={`rounded-full px-1.5 py-0.5 text-xs ${r.mine ? "bg-signal/20" : "bg-[var(--bg-incoming)]"}`}
              >
                {r.emoji} {r.count}
              </button>
            ))}
          </div>
        ) : null}
        {hover ? (
          <div className={`absolute -top-7 flex gap-0.5 rounded-full bg-[var(--bg-header)] px-1 py-0.5 shadow ${mine ? "right-0" : "left-0"}`}>
            {REACTIONS.map((emoji) => (
              <button key={emoji} type="button" className="px-1" onClick={() => void api.react(msg.id, emoji)}>
                {emoji}
              </button>
            ))}
            <button type="button" className="px-1 text-xs text-[var(--text-muted)]" onClick={onReply}>
              Reply
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Ticks({ status }: { status: string }) {
  if (status === "sending") return <span>…</span>;
  const color = status === "read" ? "text-sky-200" : "";
  return (
    <span className={color} title={status}>
      {status === "sent" ? "✓" : "✓✓"}
    </span>
  );
}
