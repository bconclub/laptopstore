import type { Metadata } from "next";
import { CheckoutFlow } from "./CheckoutFlow";

export const metadata: Metadata = { title: "Checkout | Laptop Store India" };
export const dynamic = "force-dynamic";

export default function CheckoutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 lg:py-12">
      <h1 className="text-2xl font-bold text-ink-900">Checkout</h1>
      <p className="mt-1 text-sm text-ink-500">
        Live stock across 35 stores + partner network. Your pincode decides the fastest route.
      </p>
      <CheckoutFlow />
    </main>
  );
}
