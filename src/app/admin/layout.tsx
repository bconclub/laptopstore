import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { AdminShell } from "./AdminShell";

export const metadata: Metadata = { title: "Admin | Laptop Store India" };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  // No session (login page) — no admin chrome. The nav belongs to signed-in staff only.
  if (!session) return <div data-admin className="min-h-screen bg-surface">{children}</div>;
  return (
    <div data-admin>
      <AdminShell role={session.role} name={session.name}>{children}</AdminShell>
    </div>
  );
}
