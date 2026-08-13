"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { api, uploadFile } from "@/lib/api";
import { useAuth } from "@/store/auth";

export default function SetupPage() {
  const router = useRouter();
  const setUser = useAuth((s) => s.setUser);
  const [name, setName] = useState("");
  const [about, setAbout] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let avatar_key: string | undefined;
      if (file) {
        const uploaded = await uploadFile(file, "avatar");
        avatar_key = uploaded.key;
      }
      const user = await api.updateMe({
        display_name: name.trim() || "Signal User",
        about: about.trim(),
        avatar_key,
      });
      setUser(user);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">Choose a name and optional photo.</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <label className="flex cursor-pointer items-center gap-3 text-sm text-[var(--text-muted)]">
          <span className="rounded-full bg-[var(--bg-rail)] px-3 py-2">Choose avatar</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file ? <span>{file.name}</span> : null}
        </label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Display name"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-rail)] px-4 py-3 outline-none focus:border-signal"
        />
        <input
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          placeholder="About (optional)"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-rail)] px-4 py-3 outline-none focus:border-signal"
        />
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button
          disabled={loading}
          className="w-full rounded-xl bg-signal py-3 font-medium text-white hover:bg-signal-2 disabled:opacity-60"
        >
          {loading ? "Saving…" : "Finish"}
        </button>
      </form>
    </AuthShell>
  );
}
