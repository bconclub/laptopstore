import type { Metadata } from "next";
import { BadgeCheck, ShieldCheck, Star } from "lucide-react";
import { totalBranches } from "@/data/locations";
import StoreLocator from "@/components/StoreLocator";
import Breadcrumbs from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Store locator",
  description: `${totalBranches} Laptop Store India showrooms and service centres across Chennai, Bangalore, Mumbai, Pune, Hyderabad and Kolkata.`,
};

const trust = [
  { icon: BadgeCheck, text: "Authorised brand outlets" },
  { icon: ShieldCheck, text: "Genuine, warrantied stock" },
  { icon: Star, text: "RBI Best Seller honours" },
];

export default function StoresPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-4">
      <Breadcrumbs items={[{ label: "Store locator" }]} />

      <header className="mt-3">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
          <span className="text-brand-600">{totalBranches} stores</span> across India
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500 sm:text-base">
          Every location is a showroom plus an authorised service centre. Pick a city to see its
          stores, tap a pin on the map, or walk in for purchases, repairs and same-day part
          replacement.
        </p>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          {trust.map(({ icon: Icon, text }) => (
            <span key={text} className="inline-flex items-center gap-2 text-xs font-medium text-ink-700 sm:text-sm">
              <Icon className="h-4 w-4 text-brand-500" aria-hidden="true" />
              {text}
            </span>
          ))}
        </div>
      </header>

      <div className="mt-6 pb-8">
        <StoreLocator />
      </div>
    </div>
  );
}
