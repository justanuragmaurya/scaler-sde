"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { api, setAccessToken } from "@/lib/api";
import { useAuth } from "@/store/auth";

export default function VerifyPage() {
  const router = useRouter();
  const setUser = useAuth((s) => s.setUser);
  const [code, setCode] = useState("123456");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("signal_phone");
    if (!stored) router.replace("/login");
    else setPhone(stored);
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.verifyOtp(phone, code);
      setAccessToken(data.access_token);
      setUser(data.user);
      router.replace(data.is_new ? "/setup" : "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-semibold tracking-tight">Enter the code</h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">Sent to {phone}. Demo OTP is 123456.</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <input
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="numeric"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-rail)] px-4 py-3 text-center text-2xl tracking-[0.4em] outline-none focus:border-signal"
        />
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button
          disabled={loading}
          className="w-full rounded-xl bg-signal py-3 font-medium text-white hover:bg-signal-2 disabled:opacity-60"
        >
          {loading ? "Verifying…" : "Verify"}
        </button>
      </form>
    </AuthShell>
  );
}
