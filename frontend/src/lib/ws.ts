import type { WsEvent } from "./types";

export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/ws";

export function connectSocket(
  token: string,
  onEvent: (event: WsEvent) => void,
): { close: () => void; send: (data: unknown) => void } {
  let closed = false;
  let ws: WebSocket | null = null;
  let retries = 0;
  let ping: number | undefined;

  const open = () => {
    if (closed) return;
    ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);
    ws.onmessage = (ev) => {
      try {
        onEvent(JSON.parse(ev.data) as WsEvent);
      } catch {
        /* ignore */
      }
    };
    ws.onopen = () => {
      retries = 0;
      ping = window.setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
      }, 25000);
    };
    ws.onclose = () => {
      if (ping) window.clearInterval(ping);
      if (closed) return;
      const delay = Math.min(1000 * 2 ** retries, 15000);
      retries += 1;
      window.setTimeout(open, delay);
    };
  };

  open();
  return {
    close: () => {
      closed = true;
      if (ping) window.clearInterval(ping);
      ws?.close();
    },
    send: (data: unknown) => {
      if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
    },
  };
}
