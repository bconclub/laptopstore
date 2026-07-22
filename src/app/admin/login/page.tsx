"use client";

/**
 * Staff sign-in — demo build. Two clear roles up front (Admin runs everything;
 * Store Manager shows the scoped view — one manager stands in for all 35).
 * Specialist desks tucked below. Supabase Auth replaces this at go-live.
 */

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Store } from "lucide-react";
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

  const admin = users.find((u) => u.role === "hq_admin");
  const manager = users.find((u) => u.role === "outlet_manager");
  const specialists = users.filter((u) => !["hq_admin", "outlet_manager"].includes(u.role));

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

      <div className="space-y-3">
        {admin && (
          <button
            onClick={() => login(admin.id)}
            disabled={!!busy}
            className="flex w-full items-center gap-4 rounded-2xl bg-white p-5 text-left shadow-(--shadow-card) ring-1 ring-line transition-all duration-150 hover:-translate-y-0.5 hover:ring-brand-400 disabled:opacity-50"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Building2 className="h-5 w-5" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-bold text-ink-900">Admin · HQ</span>
              <span className="block text-xs text-ink-500">Runs everything — catalog, orders, network, sync, analytics</span>
            </span>
            <span className="text-sm font-semibold text-brand-600">{busy === admin.id ? "…" : "Sign in"}</span>
          </button>
        )}
        {manager && (
          <button
            onClick={() => login(manager.id)}
            disabled={!!busy}
            className="flex w-full items-center gap-4 rounded-2xl bg-white p-5 text-left shadow-(--shadow-card) ring-1 ring-line transition-all duration-150 hover:-translate-y-0.5 hover:ring-brand-400 disabled:opacity-50"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-400/25 text-warn">
              <Store className="h-5 w-5" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-bold text-ink-900">Store Manager</span>
              <span className="block text-xs text-ink-500">
                Sees only their outlet's orders & repairs — every one of the 35 stores gets this same view
              </span>
            </span>
            <span className="text-sm font-semibold text-brand-600">{busy === manager.id ? "…" : "Sign in"}</span>
          </button>
        )}
      </div>

      {specialists.length > 0 && (
        <details className="mt-5">
          <summary className="cursor-pointer text-xs font-medium text-ink-400 hover:text-ink-700">
            Specialist desk logins (B2B desk, repair desk, distributor)
          </summary>
          <div className="mt-2 space-y-1.5">
            {specialists.map((u) => (
              <button
                key={u.id}
                onClick={() => login(u.id)}
                disabled={!!busy}
                className="flex w-full items-center justify-between rounded-xl bg-white px-4 py-2.5 text-left ring-1 ring-line transition-colors hover:ring-brand-300 disabled:opacity-50"
              >
                <span className="text-sm text-ink-700">{u.name}</span>
                <span className="text-xs text-ink-400">{u.role.replace(/_/g, " ")}</span>
              </button>
            ))}
          </div>
        </details>
      )}

      <p className="mt-8 text-center text-xs text-ink-300">Demo build — no passwords. Supabase Auth at go-live.</p>
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
