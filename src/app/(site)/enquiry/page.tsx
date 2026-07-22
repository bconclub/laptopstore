import type { Metadata } from "next";
import { EnquiryClient } from "./EnquiryClient";

export const metadata: Metadata = { title: "Business & Bulk Enquiry | Laptop Store India" };
export const dynamic = "force-dynamic";

export default function EnquiryPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 lg:py-12">
      <h1 className="text-2xl font-bold text-ink-900 lg:text-3xl">Business & bulk enquiry</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-500">
        Bulk orders, exchanges and corporate rentals. No instant payment — your requirement goes straight to our
        B2B desk: requirement captured, quote issued, GST invoicing, Net-30 terms.
      </p>
      <EnquiryClient />
    </main>
  );
}
