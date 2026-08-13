export type User = {
  id: string;
  phone: string;
  display_name: string;
  avatar_url: string | null;
  about: string | null;
  last_seen_at: string | null;
  created_at: string;
  online: boolean;
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  is_new: boolean;
  user: User;
};

export type Contact = {
  id: string;
  nickname: string | null;
  user: User;
};

export type Member = {
  user: User;
  role: "admin" | "member" | string;
  joined_at: string;
};

export type LastMessage = {
  id: string;
  body: string | null;
  sender_id: string;
  created_at: string;
  attachment_name: string | null;
};

export type Conversation = {
  id: string;
  type: "dm" | "group" | string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
  unread_count: number;
  last_message: LastMessage | null;
  members: Member[];
  other_user: User | null;
};

export type ReplyPreview = {
  id: string;
  sender_id: string;
  sender_name: string;
  body: string | null;
  attachment_name: string | null;
};

export type Reaction = {
  emoji: string;
  count: number;
  mine: boolean;
  user_ids: string[];
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar_url: string | null;
  body: string | null;
  reply_to: ReplyPreview | null;
  attachment_url: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
  attachment_name: string | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  status: "sending" | "sent" | "delivered" | "read" | string;
  reactions: Reaction[];
};

export type WsEvent =
  | { type: "message:new"; conversation_id: string; message: ChatMessage }
  | { type: "message:status"; conversation_id: string; message_id: string; status: string; user_id?: string }
  | { type: "typing"; conversation_id: string; user_id: string; display_name: string; typing: boolean }
  | { type: "presence"; user_id: string; online: boolean; last_seen_at: string | null }
  | { type: "reaction"; conversation_id: string; message: ChatMessage }
  | { type: "group:updated"; conversation_id: string }
  | { type: "pong" };
