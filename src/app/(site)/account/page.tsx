import type { Metadata } from "next";
import { AccountClient } from "./AccountClient";

export const metadata: Metadata = { title: "My Orders | Laptop Store India" };
export const dynamic = "force-dynamic";

export default function AccountPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 lg:py-12">
      <h1 className="text-2xl font-bold text-ink-900">My orders</h1>
      <p className="mt-1 text-sm text-ink-500">Purchases, repairs and rentals — tracked live.</p>
      <AccountClient />
    </main>
  );
}
