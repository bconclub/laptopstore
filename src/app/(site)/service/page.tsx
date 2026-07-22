import type { Metadata } from "next";
import { Suspense } from "react";
import ServiceFlow from "@/components/ServiceFlow";

export const metadata: Metadata = {
  title: "Book a repair",
  description:
    "Book a laptop repair with Laptop Store India, Acer-authorised service centre, genuine parts, same-day service in 6 cities.",
};

export default function ServicePage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh]" />}>
      <ServiceFlow />
    </Suspense>
  );
}
