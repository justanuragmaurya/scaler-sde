"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { Conversation, User } from "@/lib/types";
import { useAuth } from "@/store/auth";
import { useChat } from "@/store/chat";
import { useUi } from "@/store/ui";
import { Avatar } from "./Avatar";
import { Field, Modal } from "./Modal";

export function AppModals({ self }: { self: User }) {
  const modal = useUi((s) => s.modal);
  const comingSoon = useUi((s) => s.comingSoon);
  const close = useUi((s) => s.closeModal);
  if (modal === "new-chat") return <NewChatModal onClose={close} />;
  if (modal === "new-group") return <NewGroupModal onClose={close} />;
  if (modal === "settings") return <SettingsModal self={self} onClose={close} />;
  if (modal === "coming-soon") {
    return (
      <Modal title={comingSoon || "Coming soon"} onClose={close}>
        <p className="text-sm text-[var(--text-muted)]">This section is a placeholder, as specified in the assignment.</p>
      </Modal>
    );
  }
  return null;
}

function NewChatModal({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const replaceConversation = useChat((s) => s.replaceConversation);
  const setMobileShowChat = useUi((s) => s.setMobileShowChat);
  const [people, setPeople] = useState<User[]>([]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (q.length < 2) {
        setPeople([]);
        return;
      }
      void api.searchPeople(q).then(setPeople).catch(() => setPeople([]));
    }, 200);
    return () => window.clearTimeout(t);
  }, [q]);

  async function startDm(userId: string) {
    const convo = await api.createConversation({ type: "dm", user_id: userId });
    replaceConversation(convo);
    setMobileShowChat(true);
    onClose();
  }

  async function addByPhone(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const contact = await api.addContact(phone);
      await startDm(contact.user.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add contact");
    }
  }

  return (
    <Modal title="New chat" onClose={onClose}>
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name or number"
        className="mb-4 w-full rounded-xl bg-[var(--bg-rail)] px-3 py-2 outline-none"
      />
      <div className="max-h-56 space-y-1 overflow-y-auto">
        {people.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => void startDm(p.id)}
            className="flex w-full items-center gap-3 rounded-xl px-2 py-2 hover:bg-[var(--bg-hover)]"
          >
            <Avatar name={p.display_name} src={p.avatar_url} id={p.id} size={36} online={p.online} />
            <div className="text-left">
              <div className="text-sm font-medium">{p.display_name}</div>
              <div className="text-xs text-[var(--text-muted)]">{p.phone}</div>
            </div>
          </button>
        ))}
      </div>
      <form onSubmit={addByPhone} className="mt-4 space-y-2 border-t border-[var(--border)] pt-4">
        <Field label="Add by phone" value={phone} onChange={setPhone} placeholder="+15550000002" />
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button className="w-full rounded-xl bg-signal py-2 text-sm font-medium text-white">Add contact</button>
      </form>
    </Modal>
  );
}

function NewGroupModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<User[]>([]);
  const [people, setPeople] = useState<User[]>([]);
  const replaceConversation = useChat((s) => s.replaceConversation);
  const setMobileShowChat = useUi((s) => s.setMobileShowChat);

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (q.length < 2) return;
      void api.searchPeople(q).then(setPeople);
    }, 200);
    return () => window.clearTimeout(t);
  }, [q]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const convo = await api.createConversation({
      type: "group",
      name,
      member_ids: selected.map((u) => u.id),
    });
    replaceConversation(convo);
    setMobileShowChat(true);
    onClose();
  }

  return (
    <Modal title="New group" onClose={onClose}>
      <form onSubmit={create} className="space-y-4">
        <Field label="Group name" value={name} onChange={setName} placeholder="Weekend crew" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Add members"
          className="w-full rounded-xl bg-[var(--bg-rail)] px-3 py-2 outline-none"
        />
        <div className="flex flex-wrap gap-1">
          {selected.map((u) => (
            <button
              key={u.id}
              type="button"
              className="rounded-full bg-[var(--bg-rail)] px-2 py-1 text-xs"
              onClick={() => setSelected((s) => s.filter((x) => x.id !== u.id))}
            >
              {u.display_name} ×
            </button>
          ))}
        </div>
        <div className="max-h-40 overflow-y-auto">
          {people
            .filter((p) => !selected.some((s) => s.id === p.id))
            .map((p) => (
              <button
                key={p.id}
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 hover:bg-[var(--bg-hover)]"
                onClick={() => setSelected((s) => [...s, p])}
              >
                <Avatar name={p.display_name} src={p.avatar_url} id={p.id} size={28} />
                <span className="text-sm">{p.display_name}</span>
              </button>
            ))}
        </div>
        <button disabled={!name.trim()} className="w-full rounded-xl bg-signal py-2 text-sm font-medium text-white disabled:opacity-50">
          Create group
        </button>
      </form>
    </Modal>
  );
}

function SettingsModal({ self, onClose }: { self: User; onClose: () => void }) {
  const [name, setName] = useState(self.display_name);
  const [about, setAbout] = useState(self.about ?? "");
  const theme = useUi((s) => s.theme);
  const setTheme = useUi((s) => s.setTheme);
  const setUser = useAuth((s) => s.setUser);
  const logout = useAuth((s) => s.logout);
  const openModal = useUi((s) => s.openModal);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const user = await api.updateMe({ display_name: name, about });
    setUser(user);
    onClose();
  }

  return (
    <Modal title="Settings" onClose={onClose} wide>
      <form onSubmit={save} className="space-y-4">
        <div className="flex items-center gap-3">
          <Avatar name={self.display_name} src={self.avatar_url} id={self.id} size={56} />
          <div>
            <div className="font-medium">{self.display_name}</div>
            <div className="text-sm text-[var(--text-muted)]">{self.phone}</div>
          </div>
        </div>
        <Field label="Name" value={name} onChange={setName} />
        <Field label="About" value={about} onChange={setAbout} />
        <label className="block text-sm">
          <span className="mb-1.5 block text-[var(--text-muted)]">Appearance</span>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as "dark" | "light" | "system")}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-rail)] px-3 py-2.5"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">System</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <Placeholder onClick={() => openModal("coming-soon", "Privacy")} label="Privacy" />
          <Placeholder onClick={() => openModal("coming-soon", "Notifications")} label="Notifications" />
          <Placeholder onClick={() => openModal("coming-soon", "Linked devices")} label="Linked devices" />
          <Placeholder onClick={() => openModal("coming-soon", "Stories")} label="Stories" />
        </div>
        <div className="flex gap-2">
          <button className="flex-1 rounded-xl bg-signal py-2 text-sm font-medium text-white">Save</button>
          <button
            type="button"
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm"
            onClick={() => void logout().then(() => (window.location.href = "/login"))}
          >
            Log out
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Placeholder({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-xl bg-[var(--bg-rail)] px-3 py-3 text-left text-sm">
      {label}
      <div className="text-xs text-[var(--text-muted)]">Coming soon</div>
    </button>
  );
}

export function InfoDrawer({ convo, self }: { convo: Conversation; self: User }) {
  const setInfoOpen = useUi((s) => s.setInfoOpen);
  const loadConversations = useChat((s) => s.loadConversations);
  const me = useMemo(() => convo.members.find((m) => m.user.id === self.id), [convo, self.id]);
  const isAdmin = me?.role === "admin";
  const [q, setQ] = useState("");
  const [people, setPeople] = useState<User[]>([]);

  useEffect(() => {
    if (!q || convo.type !== "group") return;
    const t = window.setTimeout(() => {
      void api.searchPeople(q).then(setPeople);
    }, 200);
    return () => window.clearTimeout(t);
  }, [q, convo.type]);

  async function remove(userId: string) {
    await api.removeMember(convo.id, userId);
    await loadConversations();
  }

  async function add(userId: string) {
    await api.addMember(convo.id, userId);
    setQ("");
    await loadConversations();
  }

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-[var(--border)] bg-[var(--bg-list)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <h2 className="font-semibold">{convo.type === "group" ? "Group info" : "Contact info"}</h2>
        <button type="button" onClick={() => setInfoOpen(false)} className="text-sm text-[var(--text-muted)]">
          Close
        </button>
      </div>
      <div className="flex flex-col items-center gap-2 px-4 py-6">
        <Avatar
          name={convo.other_user?.display_name || convo.name || "Chat"}
          src={convo.avatar_url}
          id={convo.other_user?.id || convo.id}
          size={72}
        />
        <div className="text-lg font-medium">{convo.other_user?.display_name || convo.name}</div>
        <div className="text-sm text-[var(--text-muted)]">{convo.other_user?.phone || `${convo.members.length} members`}</div>
        {convo.other_user?.about ? <p className="text-center text-sm">{convo.other_user.about}</p> : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2">
        {convo.members.map((m) => (
          <div key={m.user.id} className="flex items-center gap-3 rounded-xl px-2 py-2">
            <Avatar name={m.user.display_name} src={m.user.avatar_url} id={m.user.id} size={32} online={m.user.online} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm">{m.user.display_name}</div>
              <div className="text-xs text-[var(--text-muted)]">{m.role}</div>
            </div>
            {convo.type === "group" && isAdmin && m.user.id !== self.id ? (
              <button type="button" className="text-xs text-red-400" onClick={() => void remove(m.user.id)}>
                Remove
              </button>
            ) : null}
          </div>
        ))}
        {convo.type === "group" && isAdmin ? (
          <div className="mt-3 px-2 pb-4">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Add member"
              className="mb-2 w-full rounded-xl bg-[var(--bg-rail)] px-3 py-2 text-sm outline-none"
            />
            {people
              .filter((p) => !convo.members.some((m) => m.user.id === p.id))
              .map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-[var(--bg-hover)]"
                  onClick={() => void add(p.id)}
                >
                  <Avatar name={p.display_name} src={p.avatar_url} id={p.id} size={28} />
                  <span className="text-sm">{p.display_name}</span>
                </button>
              ))}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
