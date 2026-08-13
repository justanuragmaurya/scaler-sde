import { create } from "zustand";
import { api } from "@/lib/api";
import type { ChatMessage, Conversation, User, WsEvent } from "@/lib/types";

type ChatState = {
  conversations: Conversation[];
  messages: Record<string, ChatMessage[]>;
  activeId: string | null;
  typing: Record<string, { user_id: string; display_name: string }[]>;
  toasts: { id: string; text: string }[];
  loadingList: boolean;
  setActive: (id: string | null) => void;
  loadConversations: () => Promise<void>;
  loadMessages: (id: string) => Promise<void>;
  send: (id: string, payload: Parameters<typeof api.sendMessage>[1], optimistic?: ChatMessage) => Promise<void>;
  applyEvent: (event: WsEvent, selfId: string) => void;
  setPresence: (userId: string, online: boolean, lastSeen: string | null) => void;
  addToast: (text: string) => void;
  dismissToast: (id: string) => void;
  replaceConversation: (convo: Conversation) => void;
  prependMessages: (id: string, older: ChatMessage[]) => void;
};

export const useChat = create<ChatState>((set, get) => ({
  conversations: [],
  messages: {},
  activeId: null,
  typing: {},
  toasts: [],
  loadingList: false,
  setActive: (id) => set({ activeId: id }),
  loadConversations: async () => {
    set({ loadingList: true });
    try {
      const conversations = await api.conversations();
      set({ conversations, loadingList: false });
    } catch {
      set({ loadingList: false });
    }
  },
  loadMessages: async (id) => {
    const rows = await api.messages(id);
    set((state) => ({ messages: { ...state.messages, [id]: rows } }));
    const last = rows.at(-1);
    if (last) {
      void api.markRead(id, last.id);
      set((state) => ({
        conversations: state.conversations.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c)),
      }));
    }
  },
  send: async (id, payload, optimistic) => {
    if (optimistic) {
      set((state) => ({
        messages: {
          ...state.messages,
          [id]: [...(state.messages[id] ?? []), optimistic],
        },
      }));
    }
    try {
      const saved = await api.sendMessage(id, payload);
      set((state) => {
        const current = state.messages[id] ?? [];
        const withoutTemp = current.filter((m) => m.id !== optimistic?.id);
        const exists = withoutTemp.some((m) => m.id === saved.id);
        return {
          messages: { ...state.messages, [id]: exists ? withoutTemp : [...withoutTemp, saved] },
        };
      });
      await get().loadConversations();
    } catch (err) {
      set((state) => ({
        messages: {
          ...state.messages,
          [id]: (state.messages[id] ?? []).filter((m) => m.id !== optimistic?.id),
        },
      }));
      throw err;
    }
  },
  applyEvent: (event, selfId) => {
    if (event.type === "message:new") {
      set((state) => {
        const existing = state.messages[event.conversation_id] ?? [];
        const already = existing.some((m) => m.id === event.message.id);
        const messages = already
          ? state.messages
          : { ...state.messages, [event.conversation_id]: [...existing, event.message] };
        const conversations = state.conversations.map((c) => {
          if (c.id !== event.conversation_id) return c;
          return {
            ...c,
            last_message: {
              id: event.message.id,
              body: event.message.body,
              sender_id: event.message.sender_id,
              created_at: event.message.created_at,
              attachment_name: event.message.attachment_name,
            },
            unread_count:
              state.activeId === c.id || event.message.sender_id === selfId
                ? 0
                : c.unread_count + 1,
          };
        });
        conversations.sort((a, b) => {
          const at = a.last_message?.created_at ?? a.created_at;
          const bt = b.last_message?.created_at ?? b.created_at;
          return bt.localeCompare(at);
        });
        return { messages, conversations };
      });
      const { activeId } = get();
      if (activeId === event.conversation_id) {
        void api.markRead(event.conversation_id, event.message.id);
      } else if (event.message.sender_id !== selfId) {
        get().addToast(`${event.message.sender_name}: ${event.message.body || event.message.attachment_name || "New message"}`);
      }
    }
    if (event.type === "message:status") {
      set((state) => ({
        messages: {
          ...state.messages,
          [event.conversation_id]: (state.messages[event.conversation_id] ?? []).map((m) =>
            m.id === event.message_id ? { ...m, status: event.status } : m,
          ),
        },
      }));
    }
    if (event.type === "reaction") {
      set((state) => ({
        messages: {
          ...state.messages,
          [event.conversation_id]: (state.messages[event.conversation_id] ?? []).map((m) =>
            m.id === event.message.id ? event.message : m,
          ),
        },
      }));
    }
    if (event.type === "typing") {
      set((state) => {
        const current = state.typing[event.conversation_id] ?? [];
        const next = event.typing
          ? [...current.filter((t) => t.user_id !== event.user_id), { user_id: event.user_id, display_name: event.display_name }]
          : current.filter((t) => t.user_id !== event.user_id);
        return { typing: { ...state.typing, [event.conversation_id]: next } };
      });
    }
    if (event.type === "presence") {
      get().setPresence(event.user_id, event.online, event.last_seen_at);
    }
    if (event.type === "group:updated") {
      void get().loadConversations();
    }
  },
  setPresence: (userId, online, lastSeen) => {
    set((state) => ({
      conversations: state.conversations.map((c) => ({
        ...c,
        other_user:
          c.other_user?.id === userId
            ? { ...c.other_user, online, last_seen_at: lastSeen }
            : c.other_user,
        members: c.members.map((m) =>
          m.user.id === userId ? { ...m, user: { ...m.user, online, last_seen_at: lastSeen } } : m,
        ),
      })),
    }));
  },
  addToast: (text) => {
    const id = crypto.randomUUID();
    set((state) => ({ toasts: [...state.toasts.slice(-4), { id, text }] }));
    window.setTimeout(() => get().dismissToast(id), 4000);
  },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  replaceConversation: (convo) => {
    set((state) => {
      const rest = state.conversations.filter((c) => c.id !== convo.id);
      return { conversations: [convo, ...rest], activeId: convo.id };
    });
  },
  prependMessages: (id, older) => {
    set((state) => {
      const current = state.messages[id] ?? [];
      const ids = new Set(current.map((m) => m.id));
      return { messages: { ...state.messages, [id]: [...older.filter((m) => !ids.has(m.id)), ...current] } };
    });
  },
}));
