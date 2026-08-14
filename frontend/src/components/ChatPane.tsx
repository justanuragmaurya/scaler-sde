"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api, resolveUrl } from "@/lib/api";
import { dayLabel, formatTime } from "@/lib/format";
import type { ChatMessage, Conversation, User } from "@/lib/types";
import { useChat } from "@/store/chat";
import { useUi } from "@/store/ui";
import { Avatar } from "./Avatar";
import { IconButton } from "./ConversationList";
import {
  ChevronIcon,
  ChevronRightIcon,
  LockTicks,
  MoreIcon,
  PhoneIcon,
  SearchIcon,
  VerifiedIcon,
  VideoIcon,
} from "./Icons";
import { Composer } from "./Composer";

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];
const EMPTY_MESSAGES: ChatMessage[] = [];
const EMPTY_TYPING: { user_id: string; display_name: string }[] = [];

export function ChatPane({
  convo,
  self,
  onTyping,
}: {
  convo: Conversation;
  self: User;
  onTyping: (typing: boolean) => void;
}) {
  const messages = useChat((s) => s.messages[convo.id] ?? EMPTY_MESSAGES);
  const typing = useChat((s) => s.typing[convo.id] ?? EMPTY_TYPING);
  const loadMessages = useChat((s) => s.loadMessages);
  const setInfoOpen = useUi((s) => s.setInfoOpen);
  const setMobileShowChat = useUi((s) => s.setMobileShowChat);
  const infoOpen = useUi((s) => s.infoOpen);
  const openModal = useUi((s) => s.openModal);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [reply, setReply] = useState<ChatMessage | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");

  useEffect(() => {
    void loadMessages(convo.id);
    setReply(null);
    setSearchOpen(false);
    setSearchQ("");
  }, [convo.id, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, typing.length]);

  const grouped = useMemo(() => {
    const days: { label: string; items: ChatMessage[] }[] = [];
    const q = searchQ.trim().toLowerCase();
    for (const msg of messages) {
      if (q && !(msg.body ?? "").toLowerCase().includes(q)) continue;
      const label = dayLabel(msg.created_at);
      const last = days.at(-1);
      if (!last || last.label !== label) days.push({ label, items: [msg] });
      else last.items.push(msg);
    }
    return days;
  }, [messages, searchQ]);

  const name = convo.type === "dm" ? convo.other_user?.display_name ?? convo.name : convo.name;

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-[var(--bg-chat)]">
      <header className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          className="rounded-full p-1 text-[var(--text-muted)] md:hidden"
          onClick={() => setMobileShowChat(false)}
        >
          <ChevronIcon />
        </button>
        <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setInfoOpen(!infoOpen)}>
          <Avatar name={name || "Chat"} src={convo.avatar_url} id={convo.other_user?.id || convo.id} size={36} />
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-[15px] font-medium">{name}</span>
            <VerifiedIcon size={15} className="shrink-0 text-[var(--text-muted)]" />
          </div>
        </button>
        <IconButton title="Video call" onClick={() => openModal("coming-soon", "Video calls")}>
          <VideoIcon size={20} />
        </IconButton>
        <IconButton title="Voice call" onClick={() => openModal("coming-soon", "Voice calls")}>
          <PhoneIcon size={20} />
        </IconButton>
        <IconButton title="Search" active={searchOpen} onClick={() => setSearchOpen((v) => !v)}>
          <SearchIcon size={20} />
        </IconButton>
        <IconButton title="More" onClick={() => setInfoOpen(!infoOpen)} active={infoOpen}>
          <MoreIcon size={18} />
        </IconButton>
      </header>
      {searchOpen ? (
        <div className="px-4 pb-2">
          <input
            autoFocus
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Search this chat"
            className="w-full rounded-full bg-[var(--bg-pill)] px-4 py-2 text-sm outline-none"
          />
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        <IntroCard convo={convo} name={name || "Chat"} onOpen={() => setInfoOpen(true)} />
        {grouped.map((group) => (
          <div key={group.label}>
            <div className="my-5 text-center text-[12px] text-[var(--text-muted)]">{group.label}</div>
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

function IntroCard({
  convo,
  name,
  onOpen,
}: {
  convo: Conversation;
  name: string;
  onOpen: () => void;
}) {
  return (
    <div className="mb-8 mt-4 flex flex-col items-center text-center">
      <button type="button" onClick={onOpen} className="flex flex-col items-center">
        <Avatar
          name={name}
          src={convo.avatar_url}
          id={convo.other_user?.id || convo.id}
          size={88}
          squircle
        />
        <div className="mt-3 flex items-center gap-0.5 text-[17px] font-medium">
          {name}
          <ChevronRightIcon size={16} className="text-[var(--text-muted)]" />
        </div>
      </button>
      <p className="mt-1 text-[13px] text-[var(--text-muted)]">
        {convo.type === "group" ? `${convo.members.length} members` : "No groups in common"}
      </p>
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
      className={`mb-1.5 flex ${mine ? "justify-end" : "justify-start"}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className={`max-w-[min(68%,540px)] ${mine ? "items-end" : "items-start"} relative`}>
        {group && !mine ? (
          <div className="mb-0.5 pl-1 text-[11px] text-[var(--text-muted)]">{msg.sender_name}</div>
        ) : null}
        <div
          className={`overflow-hidden px-[12px] py-[7px] text-[15px] leading-[1.35] ${
            mine
              ? "rounded-[18px] rounded-br-[5px] bg-[var(--bubble-out)] text-white"
              : "rounded-[18px] rounded-bl-[5px] bg-[var(--bg-incoming)]"
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
          <span className={`bubble-meta inline-flex items-center gap-[3px] text-[11px] ${mine ? "text-white/75" : "text-[var(--text-muted)]"}`}>
            <span>{formatTime(msg.created_at)}</span>
            {mine ? <LockTicks status={msg.status} /> : null}
          </span>
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
          <div className={`absolute -top-8 flex gap-0.5 rounded-full bg-[var(--bg-list)] px-1 py-0.5 shadow-lg ${mine ? "right-0" : "left-0"}`}>
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
