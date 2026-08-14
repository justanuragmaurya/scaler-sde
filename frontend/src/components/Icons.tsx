export function Icon({
  d,
  size = 22,
  className = "",
  children,
  strokeWidth = 1.7,
}: {
  d?: string;
  size?: number;
  className?: string;
  children?: React.ReactNode;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {d ? <path d={d} /> : null}
      {children}
    </svg>
  );
}

export const icons = {
  chat: "M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8A2.5 2.5 0 0 1 17.5 17H9l-4 3v-3.2A2.5 2.5 0 0 1 4 14.5z",
  phone: "M6.5 3.5h3l1.2 3-2 1.5a12 12 0 0 0 6.3 6.3l1.5-2 3 1.2v3A1.5 1.5 0 0 1 18 18.2 15.5 15.5 0 0 1 5.8 6 1.5 1.5 0 0 1 6.5 3.5z",
  settings:
    "M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.3-4.3",
  send: "M22 2L11 13 M22 2l-7 20-4-9-9-4 20-7z",
  plus: "M12 5v14 M5 12h14",
  x: "M18 6L6 18 M6 6l12 12",
  chevron: "M15 18l-6-6 6-6",
  more: "M12 5v.01 M12 12v.01 M12 19v.01",
};

export function MenuIcon({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <Icon size={size} className={className} strokeWidth={1.8}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Icon>
  );
}

export function ChatIcon({ size = 22, className = "" }: { size?: number; className?: string }) {
  return <Icon d={icons.chat} size={size} className={className} />;
}

export function PhoneIcon({ size = 22, className = "" }: { size?: number; className?: string }) {
  return <Icon d={icons.phone} size={size} className={className} />;
}

export function StoriesIcon({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <Icon size={size} className={className} strokeWidth={1.7}>
      <circle cx="12" cy="12" r="8.2" strokeDasharray="3.2 2.6" />
      <circle cx="12" cy="12" r="4.2" />
    </Icon>
  );
}

export function SettingsIcon({ size = 22, className = "" }: { size?: number; className?: string }) {
  return <Icon d={icons.settings} size={size} className={className} />;
}

export function ComposeIcon({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <Icon size={size} className={className} strokeWidth={1.7}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 15.5 15.2 8.3a1.2 1.2 0 0 1 1.7 1.7L9.7 17.2H8z" />
    </Icon>
  );
}

export function MoreIcon({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <circle cx="12" cy="6" r="1.35" />
      <circle cx="12" cy="12" r="1.35" />
      <circle cx="12" cy="18" r="1.35" />
    </svg>
  );
}

export function SearchIcon({ size = 22, className = "" }: { size?: number; className?: string }) {
  return <Icon d={icons.search} size={size} className={className} />;
}

export function FilterIcon({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <Icon size={size} className={className} strokeWidth={1.8}>
      <path d="M4 7h16M7 12h10M10 17h4" />
    </Icon>
  );
}

export function VideoIcon({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <Icon size={size} className={className} strokeWidth={1.7}>
      <rect x="3" y="7" width="12.5" height="10" rx="2.2" />
      <path d="M15.5 10.5 21 8v8l-5.5-2.5z" />
    </Icon>
  );
}

export function EmojiIcon({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <Icon size={size} className={className} strokeWidth={1.7}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 9.5h.01M15.5 9.5h.01M8.2 14c1.1 1.4 2.6 2.1 3.8 2.1s2.7-.7 3.8-2.1" />
    </Icon>
  );
}

export function MicIcon({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <Icon size={size} className={className} strokeWidth={1.7}>
      <rect x="9" y="3.5" width="6" height="10" rx="3" />
      <path d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v3.5" />
    </Icon>
  );
}

export function PlusIcon({ size = 22, className = "" }: { size?: number; className?: string }) {
  return <Icon d={icons.plus} size={size} className={className} />;
}

export function SendIcon({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M3.4 11.2 20.1 3.6c.7-.3 1.4.4 1.1 1.1l-7.6 16.7c-.3.7-1.3.6-1.5-.1l-1.8-6.3-6.3-1.8c-.7-.2-.8-1.2-.1-1.5z" />
    </svg>
  );
}

export function ChevronIcon({ size = 22, className = "" }: { size?: number; className?: string }) {
  return <Icon d={icons.chevron} size={size} className={className} />;
}

export function ChevronRightIcon({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <Icon size={size} className={className} strokeWidth={2}>
      <path d="M9 6l6 6-6 6" />
    </Icon>
  );
}

export function LockIcon({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <Icon size={size} className={className} strokeWidth={2}>
      <rect x="6" y="11" width="12" height="9" rx="2" />
      <path d="M8.5 11V8.5a3.5 3.5 0 0 1 7 0V11" />
    </Icon>
  );
}

export function VerifiedIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className} fill="none">
      <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.2 8.1 7.1 10l3.7-4.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LockTicks({ status, className = "" }: { status: string; className?: string }) {
  const double = status === "delivered" || status === "read";
  const color = status === "read" ? "#c5dcff" : "currentColor";
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" className={className} fill="none" aria-hidden>
      <path
        d="M4.2 5.4V4.1a3.8 3.8 0 0 1 7.6 0v1.3"
        stroke={color}
        strokeWidth="1.15"
        strokeLinecap="round"
      />
      <rect x="2.4" y="5.3" width="11.2" height="6.2" rx="1.6" stroke={color} strokeWidth="1.15" />
      {status === "sending" ? (
        <path d="M8 7.2v1.8" stroke={color} strokeWidth="1.15" strokeLinecap="round" />
      ) : (
        <>
          <path d="M5.1 8.6 6.3 9.7 8.4 7.2" stroke={color} strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round" />
          {double ? (
            <path d="M7.4 8.6 8.6 9.7 10.8 7.2" stroke={color} strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round" />
          ) : null}
        </>
      )}
    </svg>
  );
}
