import { hueFromId, initials } from "@/lib/format";
import { resolveUrl } from "@/lib/api";

export function Avatar({
  name,
  src,
  id,
  size = 40,
  online,
}: {
  name: string;
  src?: string | null;
  id?: string;
  size?: number;
  online?: boolean;
}) {
  const hue = hueFromId(id || name);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={resolveUrl(src) ?? src} alt="" className="h-full w-full rounded-full object-cover" />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center rounded-full text-white"
          style={{
            background: `linear-gradient(145deg, hsl(${hue} 62% 46%), hsl(${(hue + 40) % 360} 58% 38%))`,
            fontSize: size * 0.36,
            fontWeight: 600,
          }}
        >
          {initials(name) || "?"}
        </div>
      )}
      {online ? (
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[var(--bg-list)] bg-emerald-400" />
      ) : null}
    </div>
  );
}
