import type { Metadata } from "next";
import { RentalsClient } from "./RentalsClient";

export const metadata: Metadata = { title: "Laptop Rentals | Laptop Store India" };
export const dynamic = "force-dynamic";

export default function RentalsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 lg:py-12">
      <h1 className="text-2xl font-bold text-ink-900 lg:text-3xl">Laptop rentals</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-500">
        Short and long term, corporate and individual. Sanitised, imaged, delivery ready — with 24h swap support.
        Volume pricing on 10+ units.
      </p>
      <RentalsClient />
    </main>
  );
}
