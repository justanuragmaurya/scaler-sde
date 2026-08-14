"use client";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full items-center justify-center bg-[var(--bg-chat)] p-6">
      <div className="w-full max-w-md rounded-3xl bg-[var(--bg-list)] p-8 shadow-2xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-signal text-lg font-bold text-white">
            S
          </div>
          <span className="text-lg font-semibold">Signal</span>
        </div>
        {children}
      </div>
    </div>
  );
}
