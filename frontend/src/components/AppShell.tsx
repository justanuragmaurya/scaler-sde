"use client";

import { useEffect, useRef, useState } from "react";
import { getAccessToken } from "@/lib/api";
import { connectSocket } from "@/lib/ws";
import type { User } from "@/lib/types";
import { useChat } from "@/store/chat";
import { useUi } from "@/store/ui";
import { ChatPane } from "./ChatPane";
import { ConversationList, IconButton } from "./ConversationList";
import { Icon, icons } from "./Icons";
import { AppModals, InfoDrawer } from "./Modals";
import { Avatar } from "./Avatar";

export function AppShell({ self }: { self: User }) {
  const loadConversations = useChat((s) => s.loadConversations);
  const conversations = useChat((s) => s.conversations);
  const activeId = useChat((s) => s.activeId);
  const setActive = useChat((s) => s.setActive);
  const applyEvent = useChat((s) => s.applyEvent);
  const toasts = useChat((s) => s.toasts);
  const dismissToast = useChat((s) => s.dismissToast);
  const openModal = useUi((s) => s.openModal);
  const closeModal = useUi((s) => s.closeModal);
  const infoOpen = useUi((s) => s.infoOpen);
  const mobileShowChat = useUi((s) => s.mobileShowChat);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<ReturnType<typeof connectSocket> | null>(null);
  const convo = conversations.find((c) => c.id === activeId) ?? null;

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    const sock = connectSocket(token, (event) => applyEvent(event, self.id));
    socketRef.current = sock;
    return () => sock.close();
  }, [applyEvent, self.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setQuery("");
        document.querySelector<HTMLInputElement>('input[placeholder="Search"]')?.focus();
      }
      if (meta && e.key.toLowerCase() === "n") {
        e.preventDefault();
        openModal("new-chat");
      }
      if (e.key === "Escape") {
        closeModal();
        useUi.getState().setInfoOpen(false);
      }
      if (!meta && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
        e.preventDefault();
        const idx = conversations.findIndex((c) => c.id === activeId);
        const next = e.key === "ArrowDown" ? idx + 1 : idx - 1;
        const item = conversations[Math.max(0, Math.min(conversations.length - 1, next))];
        if (item) setActive(item.id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeId, closeModal, conversations, openModal, setActive]);

  function sendTyping(typing: boolean) {
    if (!activeId) return;
    socketRef.current?.send({ type: "typing", conversation_id: activeId, typing });
  }

  return (
    <div className="flex h-full">
      <nav className="flex w-[72px] shrink-0 flex-col items-center gap-2 border-r border-[var(--border)] bg-[var(--bg-rail)] py-4">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-signal font-bold text-white">S</div>
        <IconButton title="Chats" active>
          <Icon d={icons.chat} />
        </IconButton>
        <IconButton title="Calls" onClick={() => openModal("coming-soon", "Voice / Video calls")}>
          <Icon d={icons.phone} />
        </IconButton>
        <IconButton title="Stories" onClick={() => openModal("coming-soon", "Stories")}>
          <Icon d={icons.stories} />
        </IconButton>
        <div className="mt-auto flex flex-col items-center gap-2">
          <IconButton title="Settings" onClick={() => openModal("settings")}>
            <Icon d={icons.settings} />
          </IconButton>
          <button type="button" onClick={() => openModal("settings")} className="rounded-full">
            <Avatar name={self.display_name} src={self.avatar_url} id={self.id} size={32} />
          </button>
        </div>
      </nav>

      <div className={`w-full max-w-[360px] shrink-0 border-r border-[var(--border)] md:flex ${mobileShowChat ? "hidden" : "flex"} flex-col`}>
        <ConversationList self={self} query={query} onQuery={setQuery} />
      </div>

      <div className={`${mobileShowChat ? "flex" : "hidden"} min-w-0 flex-1 md:flex`}>
        {convo ? (
          <ChatPane convo={convo} self={self} onTyping={sendTyping} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center bg-[var(--bg-chat)] text-[var(--text-muted)]">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-signal text-2xl font-bold text-white">S</div>
            <p>Select a chat to start messaging</p>
            <p className="mt-2 text-xs">⌘K search · ⌘N new chat · ↑↓ to move</p>
          </div>
        )}
        {convo && infoOpen ? <InfoDrawer convo={convo} self={self} /> : null}
      </div>

      <AppModals self={self} />
      <div className="pointer-events-none fixed right-4 top-4 z-50 space-y-2">
        {toasts.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => dismissToast(t.id)}
            className="pointer-events-auto block max-w-sm rounded-xl bg-[var(--bg-header)] px-4 py-3 text-left text-sm shadow-lg"
          >
            {t.text}
          </button>
        ))}
      </div>
      <input ref={searchRef} className="hidden" readOnly />
    </div>
  );
}
