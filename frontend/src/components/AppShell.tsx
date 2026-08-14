"use client";

import { useEffect, useRef, useState } from "react";
import { getAccessToken } from "@/lib/api";
import { connectSocket } from "@/lib/ws";
import type { User } from "@/lib/types";
import { useChat } from "@/store/chat";
import { useUi } from "@/store/ui";
import { ChatPane } from "./ChatPane";
import { ConversationList, IconButton } from "./ConversationList";
import { ChatIcon, MenuIcon, PhoneIcon, SettingsIcon, StoriesIcon } from "./Icons";
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
    <div className="flex h-full bg-[var(--bg-chat)]">
      <nav className="flex w-[68px] shrink-0 flex-col items-center bg-[var(--bg-list)] py-3">
        <IconButton title="Menu" onClick={() => openModal("settings")}>
          <MenuIcon />
        </IconButton>
        <div className="mt-3 flex flex-col items-center gap-1">
          <IconButton title="Chats" active>
            <ChatIcon />
          </IconButton>
          <IconButton title="Calls" onClick={() => openModal("coming-soon", "Calls")}>
            <PhoneIcon />
          </IconButton>
          <IconButton title="Stories" onClick={() => openModal("coming-soon", "Stories")}>
            <StoriesIcon />
          </IconButton>
        </div>
        <div className="mt-auto flex flex-col items-center gap-2">
          <IconButton title="Settings" onClick={() => openModal("settings")}>
            <SettingsIcon />
          </IconButton>
          <button type="button" onClick={() => openModal("settings")} className="rounded-full p-1">
            <Avatar name={self.display_name} src={self.avatar_url} id={self.id} size={28} />
          </button>
        </div>
      </nav>

      <div className={`w-full max-w-[340px] shrink-0 md:flex ${mobileShowChat ? "hidden" : "flex"} flex-col`}>
        <ConversationList self={self} query={query} onQuery={setQuery} />
      </div>

      <div className={`${mobileShowChat ? "flex" : "hidden"} min-w-0 flex-1 md:flex`}>
        {convo ? (
          <ChatPane convo={convo} self={self} onTyping={sendTyping} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-[var(--text-muted)]">
            <ChatIcon size={48} className="mb-4 opacity-40" />
            <p className="text-[15px]">Select a chat to start messaging</p>
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
            className="pointer-events-auto block max-w-sm rounded-xl bg-[var(--bg-list)] px-4 py-3 text-left text-sm shadow-lg"
          >
            {t.text}
          </button>
        ))}
      </div>
      <input ref={searchRef} className="hidden" readOnly />
    </div>
  );
}
