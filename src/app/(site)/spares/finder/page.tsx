import type { Metadata } from "next";
import { FinderClient } from "./FinderClient";

export const metadata: Metadata = { title: "Spares Compatibility Finder | Laptop Store India" };
export const dynamic = "force-dynamic";

export default function SparesFinderPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 lg:py-12">
      <h1 className="text-2xl font-bold text-ink-900 lg:text-3xl">Find the right part</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-500">
        2,600+ genuine spares. Type your laptop model and see every part that fits — or pick a part and see which
        models it works with. Fitting service at all our service centres.
      </p>
      <FinderClient />
    </main>
  );
}
