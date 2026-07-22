import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { AdminNav } from "./AdminNav";

export const metadata: Metadata = { title: "Admin | Laptop Store India" };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-40 border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="rounded-lg bg-brand-600 px-2 py-1 text-xs font-black uppercase tracking-wider text-white">LS</span>
            <span className="text-sm font-bold text-ink-900">Laptop Store · Admin</span>
          </Link>
          <div className="flex items-center gap-3 text-xs">
            {session ? (
              <>
                <span className="text-ink-500">
                  {session.name ?? session.userId} · <span className="font-semibold text-brand-700">{session.role.replace(/_/g, " ")}</span>
                </span>
                <Link href="/admin/login" className="rounded-lg px-3 py-1.5 font-medium text-ink-700 ring-1 ring-line hover:bg-surface">
                  Switch role
                </Link>
              </>
            ) : (
              <Link href="/admin/login" className="rounded-lg bg-brand-600 px-3 py-1.5 font-semibold text-white">Sign in</Link>
            )}
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-[1400px] gap-6 px-4 py-6">
        <AdminNav role={session?.role} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
