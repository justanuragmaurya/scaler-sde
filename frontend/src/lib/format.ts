export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function formatTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function formatListTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return formatTime(iso);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function formatLastSeen(iso: string | null, online: boolean) {
  if (online) return "Online";
  if (!iso) return "Offline";
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return "Last seen just now";
  if (diff < 3_600_000) return `Last seen ${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `Last seen ${Math.floor(diff / 3_600_000)}h ago`;
  return `Last seen ${date.toLocaleDateString()}`;
}

export function previewText(body: string | null, attachment?: string | null) {
  if (body) return body;
  if (attachment) return attachment;
  return "Attachment";
}

export function dayLabel(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

export function hueFromId(id: string) {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
  return hash;
}
