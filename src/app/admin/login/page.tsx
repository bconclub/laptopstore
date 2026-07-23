"use client";

/**
 * Staff sign-in — password gets you in as Admin (HQ). Demo role views
 * (Store Manager, desks) collapsed below; on deployed builds they need the
 * same password. Supabase Auth replaces this at go-live.
 */

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Store } from "lucide-react";
import { api } from "@/components/admin/ui";

interface StaffUser {
  id: string;
  name: string;
  role: string;
  nodeId?: string;
}

const ROLE_LABEL: Record<string, string> = {
  outlet_manager: "Store Manager",
  distributor: "Distributor",
  repair_desk: "Repair Desk",
  b2b_desk: "B2B Desk",
};

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void api<StaffUser[]>("/api/auth/admin-login").then((r) => setUsers(r.data ?? []));
  }, []);

  async function login(userId?: string) {
    setBusy(userId ?? "admin");
    setError("");
    const r = await api("/api/auth/admin-login", {
      method: "POST",
      body: JSON.stringify(userId ? { userId, password } : { password }),
    });
    if (r.ok) {
      router.push(params.get("next") ?? "/admin");
      router.refresh();
    } else {
      setError(r.error ?? "Login failed");
      setBusy("");
    }
  }

  const demoRoles = users.filter((u) => u.role !== "hq_admin");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/icon.png" alt="Laptop Store" className="h-11 w-11" />
        <span>
          <span className="block text-lg font-bold leading-tight text-ink-900">Laptop Store · Admin</span>
          <span className="block text-xs text-ink-400">One screen for the whole business</span>
        </span>
      </div>

      {error && <p className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      {/* Password sign-in */}
      <form
        onSubmit={(e) => { e.preventDefault(); void login(); }}
        className="rounded-2xl bg-white p-5 shadow-(--shadow-card) ring-1 ring-line"
      >
        <label htmlFor="admin-pass" className="mb-1.5 block text-sm font-semibold text-ink-900">
          Admin password
        </label>
        <input
          id="admin-pass"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter the admin password"
          autoFocus
          autoComplete="current-password"
          className="w-full rounded-lg border border-line px-3 py-2.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-brand-400"
        />
        <button
          type="submit"
          disabled={!!busy || !password}
          className="mt-3 w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-40"
        >
          {busy === "admin" ? "Signing in…" : "Sign in as Admin"}
        </button>
      </form>

      {demoRoles.length > 0 && (
        <details className="mt-5">
          <summary className="cursor-pointer text-xs font-medium text-ink-400 hover:text-ink-700">
            Demo role views (Store Manager, desks)
          </summary>
          <div className="mt-2 space-y-1.5">
            {demoRoles.map((u) => (
              <button
                key={u.id}
                onClick={() => login(u.id)}
                disabled={!!busy}
                className="flex w-full items-center justify-between rounded-xl bg-white px-4 py-2.5 text-left ring-1 ring-line transition-colors hover:ring-brand-300 disabled:opacity-50"
              >
                <span className="flex items-center gap-2 text-sm text-ink-700">
                  {u.role === "outlet_manager" && <Store className="h-3.5 w-3.5 text-ink-300" />}
                  {u.name}
                </span>
                <span className="text-xs text-ink-400">{ROLE_LABEL[u.role] ?? u.role.replace(/_/g, " ")}</span>
              </button>
            ))}
            <p className="text-[11px] text-ink-400">Role views use the same admin password on deployed builds.</p>
          </div>
        </details>
      )}

      <p className="mt-8 text-center text-xs text-ink-300">Demo build — Supabase Auth at go-live.</p>
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
