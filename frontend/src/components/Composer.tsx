"use client";

import { useRef, useState } from "react";
import { uploadFile } from "@/lib/api";
import type { ChatMessage, User } from "@/lib/types";
import { useChat } from "@/store/chat";
import { useUi } from "@/store/ui";
import { EmojiIcon, Icon, icons, MicIcon, PlusIcon, SendIcon } from "./Icons";

const EMOJIS = ["😀", "😂", "😍", "❤️", "👍", "🙏", "🔥", "🎉", "😢", "😮", "💯", "😊"];

export function Composer({
  convoId,
  self,
  reply,
  onClearReply,
  onTyping,
}: {
  convoId: string;
  self: User;
  reply: ChatMessage | null;
  onClearReply: () => void;
  onTyping: (typing: boolean) => void;
}) {
  const send = useChat((s) => s.send);
  const addToast = useChat((s) => s.addToast);
  const openModal = useUi((s) => s.openModal);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const typingRef = useRef<number | undefined>(undefined);
  const canSend = Boolean(text.trim() || file);

  function handleChange(value: string) {
    setText(value);
    onTyping(true);
    if (typingRef.current) window.clearTimeout(typingRef.current);
    typingRef.current = window.setTimeout(() => onTyping(false), 1200);
  }

  function insertEmoji(emoji: string) {
    setText((prev) => prev + emoji);
    setEmojiOpen(false);
    areaRef.current?.focus();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body && !file) return;
    const optimistic: ChatMessage = {
      id: `tmp-${crypto.randomUUID()}`,
      conversation_id: convoId,
      sender_id: self.id,
      sender_name: self.display_name,
      sender_avatar_url: self.avatar_url,
      body: body || null,
      reply_to: reply
        ? {
            id: reply.id,
            sender_id: reply.sender_id,
            sender_name: reply.sender_name,
            body: reply.body,
            attachment_name: reply.attachment_name,
          }
        : null,
      attachment_url: file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      attachment_type: file?.type ?? null,
      attachment_size: file?.size ?? null,
      attachment_name: file?.name ?? null,
      created_at: new Date().toISOString(),
      edited_at: null,
      deleted_at: null,
      status: "sending",
      reactions: [],
    };
    setText("");
    if (areaRef.current) areaRef.current.style.height = "auto";
    onClearReply();
    onTyping(false);
    const pending = file;
    setFile(null);
    try {
      let attachment;
      if (pending) attachment = await uploadFile(pending, "attachment");
      await send(
        convoId,
        {
          body: body || undefined,
          reply_to_id: reply?.id,
          attachment_key: attachment?.key,
          attachment_type: pending?.type,
          attachment_size: pending?.size,
          attachment_name: pending?.name,
        },
        optimistic,
      );
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Could not send");
    }
  }

  return (
    <form onSubmit={submit} className="px-3 pb-3 pt-1">
      {reply ? (
        <div className="mb-2 flex items-center justify-between rounded-xl bg-[var(--bg-pill)] px-3 py-2 text-sm">
          <div>
            <div className="text-xs text-signal">Replying to {reply.sender_name}</div>
            <div className="truncate text-[var(--text-muted)]">{reply.body || reply.attachment_name}</div>
          </div>
          <button type="button" onClick={onClearReply} className="text-[var(--text-muted)]">
            <Icon d={icons.x} size={16} />
          </button>
        </div>
      ) : null}
      {file ? (
        <div className="mb-2 flex items-center justify-between rounded-xl bg-[var(--bg-pill)] px-3 py-2 text-sm">
          <span className="truncate">{file.name}</span>
          <button type="button" onClick={() => setFile(null)}>
            <Icon d={icons.x} size={16} />
          </button>
        </div>
      ) : null}
      <div className="relative flex items-end rounded-[26px] bg-[var(--bg-pill)] px-1.5 py-1">
        <div className="relative">
          <button
            type="button"
            className="rounded-full p-2 text-[var(--text-muted)] hover:text-[var(--text)]"
            onClick={() => setEmojiOpen((v) => !v)}
            title="Emoji"
          >
            <EmojiIcon size={22} />
          </button>
          {emojiOpen ? (
            <div className="absolute bottom-11 left-0 z-20 grid w-[220px] grid-cols-6 gap-1 rounded-2xl bg-[var(--bg-list)] p-2 shadow-xl">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="rounded-lg p-1 text-lg hover:bg-[var(--bg-hover)]"
                  onClick={() => insertEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <textarea
          ref={areaRef}
          value={text}
          onChange={(e) => {
            handleChange(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
          }}
          placeholder="Message"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit(e);
            }
          }}
          className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent px-1 py-[10px] text-[15px] outline-none placeholder:text-[var(--text-muted)]"
        />
        {canSend ? (
          <button type="submit" className="rounded-full p-2 text-signal" title="Send">
            <SendIcon size={20} />
          </button>
        ) : (
          <button
            type="button"
            className="rounded-full p-2 text-[var(--text-muted)] hover:text-[var(--text)]"
            title="Voice message"
            onClick={() => openModal("coming-soon", "Voice messages")}
          >
            <MicIcon size={20} />
          </button>
        )}
        <button
          type="button"
          className="rounded-full p-2 text-[var(--text-muted)] hover:text-[var(--text)]"
          onClick={() => fileRef.current?.click()}
          title="Attach"
        >
          <PlusIcon size={20} />
        </button>
      </div>
    </form>
  );
}
