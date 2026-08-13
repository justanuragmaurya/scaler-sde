"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { api } from "@/lib/api";
import { useAuth } from "@/store/auth";

export default function LoginPage() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const hydrated = useAuth((s) => s.hydrated);
  const [phone, setPhone] = useState("+15550000001");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (hydrated && user) router.replace("/");
  }, [hydrated, user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.requestOtp(phone);
      sessionStorage.setItem("signal_phone", data.phone);
      router.push("/verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-semibold tracking-tight">Enter your phone number</h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        We’ll send a verification code. For this demo the code is always{" "}
        <span className="font-medium text-[var(--text)]">123456</span>.
      </p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <input
          autoFocus
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-rail)] px-4 py-3 text-lg outline-none focus:border-signal"
          placeholder="+1 555 000 0001"
        />
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button
          disabled={loading}
          className="w-full rounded-xl bg-signal py-3 font-medium text-white hover:bg-signal-2 disabled:opacity-60"
        >
          {loading ? "Sending…" : "Continue"}
        </button>
      </form>
      <p className="mt-6 text-xs text-[var(--text-muted)]">
        Seeded demo accounts: +15550000001 Alice through +15550000005 Eve.
      </p>
    </AuthShell>
  );
}
