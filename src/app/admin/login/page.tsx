"use client";

/** One-click staff login (mock build). Replaced by Supabase Auth later. */

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { api } from "@/components/admin/ui";

interface StaffUser {
  id: string;
  name: string;
  role: string;
  nodeId?: string;
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void api<StaffUser[]>("/api/auth/admin-login").then((r) => setUsers(r.data ?? []));
  }, []);

  async function login(userId: string) {
    setBusy(userId);
    setError("");
    const r = await api("/api/auth/admin-login", { method: "POST", body: JSON.stringify({ userId }) });
    if (r.ok) {
      router.push(params.get("next") ?? "/admin");
      router.refresh();
    } else {
      setError(r.error ?? "Login failed");
      setBusy("");
    }
  }

  return (
    <main className="mx-auto max-w-md py-10">
      <h1 className="text-xl font-bold text-ink-900">Staff sign-in</h1>
      <p className="mt-1 text-sm text-ink-500">Demo build: pick a role — no password. Supabase Auth replaces this at go-live.</p>
      {error && <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      <div className="mt-6 space-y-2">
        {users.map((u) => (
          <button
            key={u.id}
            onClick={() => login(u.id)}
            disabled={!!busy}
            className="flex w-full items-center justify-between rounded-xl bg-white px-4 py-3 text-left ring-1 ring-line hover:ring-brand-400 disabled:opacity-50"
          >
            <span>
              <span className="block text-sm font-semibold text-ink-900">{u.name}</span>
              <span className="text-xs text-ink-500">{u.role.replace(/_/g, " ")}{u.nodeId ? ` · ${u.nodeId}` : ""}</span>
            </span>
            <span className="text-xs font-semibold text-brand-600">{busy === u.id ? "Signing in…" : "Sign in →"}</span>
          </button>
        ))}
      </div>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
