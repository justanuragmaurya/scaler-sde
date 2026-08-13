import type { AuthResponse, ChatMessage, Contact, Conversation, User } from "./types";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

const TOKEN_KEY = "signal_access_token";

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

let refreshing: Promise<boolean> | null = null;

async function refreshAccess(): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) return false;
  const data = (await res.json()) as AuthResponse;
  setAccessToken(data.access_token);
  return true;
}

async function request(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  if (res.status === 401 && retry && path !== "/api/auth/refresh") {
    refreshing ??= refreshAccess().finally(() => {
      refreshing = null;
    });
    const ok = await refreshing;
    if (ok) return request(path, init, false);
  }
  return res;
}

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await request(path, init);
  if (!res.ok) {
    let detail = "Request failed";
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      /* ignore */
    }
    throw new Error(typeof detail === "string" ? detail : "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  requestOtp: (phone: string) => json<{ ok: boolean; phone: string }>("/api/auth/request-otp", { method: "POST", body: JSON.stringify({ phone }) }),
  verifyOtp: (phone: string, code: string) =>
    json<AuthResponse>("/api/auth/verify-otp", { method: "POST", body: JSON.stringify({ phone, code }) }),
  refresh: () => json<AuthResponse>("/api/auth/refresh", { method: "POST" }),
  logout: () => request("/api/auth/logout", { method: "POST" }),
  me: () => json<User>("/api/users/me"),
  updateMe: (body: { display_name?: string; about?: string; avatar_key?: string }) =>
    json<User>("/api/users/me", { method: "PATCH", body: JSON.stringify(body) }),
  contacts: () => json<Contact[]>("/api/contacts"),
  searchPeople: (q: string) => json<User[]>(`/api/contacts/search?q=${encodeURIComponent(q)}`),
  addContact: (phone: string, nickname?: string) =>
    json<Contact>("/api/contacts", { method: "POST", body: JSON.stringify({ phone, nickname }) }),
  conversations: () => json<Conversation[]>("/api/conversations"),
  conversation: (id: string) => json<Conversation>(`/api/conversations/${id}`),
  createConversation: (body: {
    type: "dm" | "group";
    user_id?: string;
    name?: string;
    member_ids?: string[];
    avatar_key?: string;
  }) => json<Conversation>("/api/conversations", { method: "POST", body: JSON.stringify(body) }),
  updateConversation: (id: string, body: { name?: string; avatar_key?: string }) =>
    json<Conversation>(`/api/conversations/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  addMember: (id: string, user_id: string) =>
    json(`/api/conversations/${id}/members`, { method: "POST", body: JSON.stringify({ user_id }) }),
  removeMember: (id: string, user_id: string) => request(`/api/conversations/${id}/members/${user_id}`, { method: "DELETE" }),
  messages: (id: string, before?: string) =>
    json<ChatMessage[]>(`/api/conversations/${id}/messages${before ? `?before=${before}` : ""}`),
  sendMessage: (
    id: string,
    body: {
      body?: string;
      reply_to_id?: string;
      attachment_key?: string;
      attachment_type?: string;
      attachment_size?: number;
      attachment_name?: string;
    },
  ) => json<ChatMessage>(`/api/conversations/${id}/messages`, { method: "POST", body: JSON.stringify(body) }),
  markRead: (id: string, message_id: string) =>
    request(`/api/conversations/${id}/read`, { method: "POST", body: JSON.stringify({ message_id }) }),
  react: (messageId: string, emoji: string) =>
    json<ChatMessage>(`/api/messages/${messageId}/reactions`, { method: "POST", body: JSON.stringify({ emoji }) }),
  presign: (body: { filename: string; content_type: string; size: number; kind: "avatar" | "attachment" }) =>
    json<{ key: string; upload_url: string; headers: Record<string, string>; public_url: string | null }>(
      "/api/uploads/presign",
      { method: "POST", body: JSON.stringify(body) },
    ),
};

export function resolveUrl(url: string | null | undefined) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API_BASE}${url}`;
}

export async function uploadFile(file: File, kind: "avatar" | "attachment") {
  const signed = await api.presign({
    filename: file.name,
    content_type: file.type || "application/octet-stream",
    size: file.size,
    kind,
  });
  const url = signed.upload_url.startsWith("http") ? signed.upload_url : `${API_BASE}${signed.upload_url}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: signed.headers,
    body: file,
  });
  if (!res.ok) throw new Error("Upload failed");
  return signed;
}
