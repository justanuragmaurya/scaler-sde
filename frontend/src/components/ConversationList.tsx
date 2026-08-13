"use client";

import { formatListTime, formatLastSeen, previewText } from "@/lib/format";
import type { Conversation, User } from "@/lib/types";
import { useChat } from "@/store/chat";
import { useUi } from "@/store/ui";
import { Avatar } from "./Avatar";
import { Icon, icons } from "./Icons";

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

  const filtered = conversations.filter((c) => {
    const hay = `${c.name ?? ""} ${c.other_user?.display_name ?? ""} ${c.other_user?.phone ?? ""}`.toLowerCase();
    return hay.includes(query.toLowerCase());
  });

  return (
    <div className="flex h-full min-w-0 flex-col bg-[var(--bg-list)]">
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <h1 className="text-xl font-semibold">Chats</h1>
        <div className="flex gap-1">
          <IconButton title="New chat (⌘N)" onClick={() => openModal("new-chat")}>
            <Icon d={icons.edit} size={18} />
          </IconButton>
          <IconButton title="New group" onClick={() => openModal("new-group")}>
            <Icon d={icons.users} size={18} />
          </IconButton>
        </div>
      </div>
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2 rounded-xl bg-[var(--bg-rail)] px-3 py-2">
          <Icon d={icons.search} size={16} className="text-[var(--text-muted)]" />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
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
  const online = convo.other_user?.online;
  const last = convo.last_message;
  const preview = last
    ? `${last.sender_id === selfId ? "You: " : ""}${previewText(last.body, last.attachment_name)}`
    : "No messages yet";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[var(--bg-hover)] ${active ? "bg-[var(--bg-hover)]" : ""}`}
    >
      <Avatar
        name={name || "Chat"}
        src={convo.avatar_url}
        id={convo.other_user?.id || convo.id}
        online={convo.type === "dm" ? online : undefined}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate font-medium">{name}</span>
          {last ? (
            <span className="shrink-0 text-[11px] text-[var(--text-muted)]">{formatListTime(last.created_at)}</span>
          ) : null}
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className="truncate text-[13px] text-[var(--text-muted)]">{preview}</p>
          {convo.unread_count > 0 ? (
            <span className="min-w-5 rounded-full bg-signal px-1.5 text-center text-[11px] font-semibold text-white">
              {convo.unread_count}
            </span>
          ) : null}
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
      className={`rounded-full p-2 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)] ${active ? "text-signal" : ""}`}
    >
      {children}
    </button>
  );
}

export function subtitleFor(convo: Conversation) {
  if (convo.type === "group") return `${convo.members.length} members`;
  if (!convo.other_user) return "";
  return formatLastSeen(convo.other_user.last_seen_at, convo.other_user.online);
}
