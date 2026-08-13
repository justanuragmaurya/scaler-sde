"use client";

import { useRef, useState } from "react";
import { uploadFile } from "@/lib/api";
import type { ChatMessage, User } from "@/lib/types";
import { useChat } from "@/store/chat";
import { Icon, icons } from "./Icons";

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
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingRef = useRef<number | undefined>(undefined);

  function handleChange(value: string) {
    setText(value);
    onTyping(true);
    if (typingRef.current) window.clearTimeout(typingRef.current);
    typingRef.current = window.setTimeout(() => onTyping(false), 1200);
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
    <form onSubmit={submit} className="border-t border-[var(--border)] bg-[var(--bg-composer)] px-3 py-3">
      {reply ? (
        <div className="mb-2 flex items-center justify-between rounded-xl bg-[var(--bg-rail)] px-3 py-2 text-sm">
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
        <div className="mb-2 flex items-center justify-between rounded-xl bg-[var(--bg-rail)] px-3 py-2 text-sm">
          <span className="truncate">{file.name}</span>
          <button type="button" onClick={() => setFile(null)}>
            <Icon d={icons.x} size={16} />
          </button>
        </div>
      ) : null}
      <div className="flex items-end gap-2">
        <button
          type="button"
          className="mb-1 rounded-full p-2 text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
          onClick={() => fileRef.current?.click()}
          title="Attach"
        >
          <Icon d={icons.paperclip} size={20} />
        </button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <textarea
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Signal message"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit(e);
            }
          }}
          className="max-h-40 min-h-[44px] flex-1 resize-none rounded-2xl bg-[var(--bg-rail)] px-4 py-3 text-sm outline-none"
        />
        <button
          type="submit"
          className="mb-1 rounded-full bg-signal p-2.5 text-white hover:bg-signal-2"
          title="Send"
        >
          <Icon d={icons.send} size={18} />
        </button>
      </div>
    </form>
  );
}
