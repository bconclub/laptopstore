import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { AdminNav } from "./AdminNav";

export const metadata: Metadata = { title: "Admin | Laptop Store India" };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <div className="flex min-h-screen bg-surface">
      <div className="sticky top-0 h-screen">
        <AdminNav role={session?.role} name={session?.name} />
      </div>
      <main className="min-w-0 flex-1 px-8 py-7">{children}</main>
    </div>
  );
}
