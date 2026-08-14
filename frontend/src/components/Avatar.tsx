import { hueFromId, initials } from "@/lib/format";
import { resolveUrl } from "@/lib/api";

const PALETTE = [
  "#c4a574",
  "#c45c4a",
  "#4a9b8c",
  "#5b7cbf",
  "#8e5aa8",
  "#d08a3a",
  "#5c8a4a",
  "#b85c7a",
];

export function Avatar({
  name,
  src,
  id,
  size = 48,
  online,
  squircle = false,
}: {
  name: string;
  src?: string | null;
  id?: string;
  size?: number;
  online?: boolean;
  squircle?: boolean;
}) {
  const color = PALETTE[hueFromId(id || name) % PALETTE.length];
  const radius = squircle ? "28%" : "50%";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolveUrl(src) ?? src}
          alt=""
          className="h-full w-full object-cover"
          style={{ borderRadius: radius }}
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center text-white"
          style={{
            background: color,
            borderRadius: radius,
            fontSize: size * 0.34,
            fontWeight: 600,
            letterSpacing: "0.02em",
          }}
        >
          {initials(name) || "?"}
        </div>
      )}
      {online ? (
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[var(--bg-list)] bg-[#4caf50]" />
      ) : null}
    </div>
  );
}
