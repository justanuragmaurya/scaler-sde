"use client";

import { useEffect, useRef, useState } from "react";
import { formatListTime, previewText } from "@/lib/format";
import type { Conversation, User } from "@/lib/types";
import { useChat } from "@/store/chat";
import { useUi } from "@/store/ui";
import { Avatar } from "./Avatar";
import { ComposeIcon, FilterIcon, LockIcon, MoreIcon, SearchIcon } from "./Icons";

export function ConversationList({
  self,
  query,
  onQuery,
}: {
  self: User;
  query: string;
  onQuery: (v: string) => void;
}) {
  const conversations = useChat((s) => s.conversations);
  const activeId = useChat((s) => s.activeId);
  const setActive = useChat((s) => s.setActive);
  const setMobileShowChat = useUi((s) => s.setMobileShowChat);
  const openModal = useUi((s) => s.openModal);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = conversations.filter((c) => {
    if (unreadOnly && c.unread_count < 1) return false;
    const hay = `${c.name ?? ""} ${c.other_user?.display_name ?? ""} ${c.other_user?.phone ?? ""}`.toLowerCase();
    return hay.includes(query.toLowerCase());
  });

  return (
    <div className="flex h-full min-w-0 flex-col bg-[var(--bg-list)]">
      <div className="flex items-center justify-between px-4 pb-1 pt-4">
        <h1 className="text-[22px] font-semibold tracking-tight">Chats</h1>
        <div className="flex items-center gap-0.5">
          <IconButton title="New chat (⌘N)" onClick={() => openModal("new-chat")}>
            <ComposeIcon size={20} />
          </IconButton>
          <div className="relative" ref={menuRef}>
            <IconButton title="More" onClick={() => setMenuOpen((v) => !v)}>
              <MoreIcon size={18} />
            </IconButton>
            {menuOpen ? (
              <div className="absolute right-0 top-10 z-20 w-44 overflow-hidden rounded-xl bg-[var(--bg-hover)] py-1 shadow-xl">
                <button
                  type="button"
                  className="block w-full px-4 py-2.5 text-left text-sm hover:bg-black/20"
                  onClick={() => {
                    setMenuOpen(false);
                    openModal("new-group");
                  }}
                >
                  New group
                </button>
                <button
                  type="button"
                  className="block w-full px-4 py-2.5 text-left text-sm hover:bg-black/20"
                  onClick={() => {
                    setMenuOpen(false);
                    openModal("coming-soon", "Archived chats");
                  }}
                >
                  Archived
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 px-3 pb-3 pt-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-[var(--bg-search)] px-3 py-[7px]">
          <SearchIcon size={15} className="text-[var(--text-muted)]" />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search"
            className="w-full bg-transparent text-[14px] outline-none placeholder:text-[var(--text-muted)]"
          />
        </div>
        <IconButton
          title={unreadOnly ? "Show all chats" : "Unread only"}
          active={unreadOnly}
          onClick={() => setUnreadOnly((v) => !v)}
        >
          <FilterIcon size={18} />
        </IconButton>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {filtered.map((c) => (
          <ConversationRow
            key={c.id}
            convo={c}
            selfId={self.id}
            active={c.id === activeId}
            onClick={() => {
              setActive(c.id);
              setMobileShowChat(true);
            }}
          />
        ))}
        {!filtered.length ? (
          <p className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">No conversations yet</p>
        ) : null}
      </div>
    </div>
  );
}

function ConversationRow({
  convo,
  selfId,
  active,
  onClick,
}: {
  convo: Conversation;
  selfId: string;
  active: boolean;
  onClick: () => void;
}) {
  const name = convo.type === "dm" ? convo.other_user?.display_name ?? convo.name : convo.name;
  const last = convo.last_message;
  const preview = last
    ? `${last.sender_id === selfId ? "You: " : ""}${previewText(last.body, last.attachment_name)}`
    : "No messages yet";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-3 py-[10px] text-left ${active ? "bg-[var(--bg-hover)]" : "hover:bg-[var(--bg-hover)]/60"}`}
    >
      <Avatar name={name || "Chat"} src={convo.avatar_url} id={convo.other_user?.id || convo.id} size={48} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[15px] font-medium">{name}</span>
          {last ? (
            <span className="shrink-0 text-[12px] text-[var(--text-muted)]">{formatListTime(last.created_at)}</span>
          ) : null}
        </div>
        <div className="mt-[2px] flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-[13px] text-[var(--text-muted)]">{preview}</p>
          {convo.unread_count > 0 ? (
            <span className="min-w-5 rounded-full bg-signal px-1.5 text-center text-[11px] font-semibold leading-5 text-white">
              {convo.unread_count}
            </span>
          ) : (
            <LockIcon size={13} className="shrink-0 text-[var(--text-muted)] opacity-70" />
          )}
        </div>
      </div>
    </button>
  );
}

export function IconButton({
  children,
  onClick,
  title,
  active,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded-full p-2.5 hover:bg-[var(--bg-hover)] ${
        active ? "text-[var(--text)]" : "text-[var(--text-muted)] hover:text-[var(--text)]"
      }`}
    >
      {children}
    </button>
  );
}

export function subtitleFor(convo: Conversation) {
  if (convo.type === "group") return `${convo.members.length} members`;
  if (!convo.other_user) return "";
  if (convo.other_user.online) return "Online";
  return "";
}
