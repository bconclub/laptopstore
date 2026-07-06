"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Laptop,
  RefreshCw,
  Wrench,
  Cpu,
  Printer,
  Boxes,
  Building2,
  Receipt,
  Headset,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import SearchBox from "@/components/SearchBox";

type Chip =
  | { label: string; Icon: LucideIcon; kind: "link"; href: string }
  | { label: string; Icon: LucideIcon; kind: "wa"; wa: string };

const WA_NUMBER = "919500156666";
const waLink = (msg: string) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;

const personalChips: Chip[] = [
  { label: "New Laptops", href: "/category/laptops", Icon: Laptop, kind: "link" },
  { label: "Refurbished", href: "/category/refurbished-laptops", Icon: RefreshCw, kind: "link" },
  { label: "Repair", href: "/service", Icon: Wrench, kind: "link" },
  { label: "Spares", href: "/category/laptop-spares", Icon: Cpu, kind: "link" },
  { label: "Printers", href: "/category/printers", Icon: Printer, kind: "link" },
];

const businessChips: Chip[] = [
  { label: "Bulk orders", wa: "Hi! I'd like a quote for a bulk laptop order.", Icon: Boxes, kind: "wa" },
  { label: "AMC & leasing", wa: "Hi! I'd like details on AMC & laptop leasing plans.", Icon: Building2, kind: "wa" },
  { label: "GST billing", wa: "Hi! I need a GST invoice for a business purchase.", Icon: Receipt, kind: "wa" },
  { label: "Corporate support", wa: "Hi! I need corporate/onsite support for our office laptops.", Icon: Headset, kind: "wa" },
];

const copy = {
  personal: {
    heading: (
      <>
        India&apos;s laptop universe,
        <br />
        <span className="relative text-brand-600">
          in one store.
          <span aria-hidden="true" className="absolute -bottom-1 left-0 h-2 w-full rounded-full bg-accent-400/70" />
        </span>
      </>
    ),
    sub: (
      <>
        Buy new laptops, choose certified{" "}
        <Link href="/category/refurbished-laptops" className="font-semibold text-brand-600 hover:underline">
          refurbished
        </Link>
        , book{" "}
        <Link href="/service" className="font-semibold text-brand-600 hover:underline">
          repairs
        </Link>{" "}
        and shop 2,600+ genuine{" "}
        <Link href="/category/laptop-spares" className="font-semibold text-brand-600 hover:underline">
          spare parts
        </Link>
        .
      </>
    ),
  },
  business: {
    heading: (
      <>
        Laptops for your business,
        <br />
        <span className="relative text-brand-600">
          sorted.
          <span aria-hidden="true" className="absolute -bottom-1 left-0 h-2 w-full rounded-full bg-accent-400/70" />
        </span>
      </>
    ),
    sub: (
      <>
        Bulk orders, GST billing, AMC &amp; leasing and onsite support for offices — one point of contact
        across 6 cities.
      </>
    ),
  },
};

export default function HeroSearch() {
  const [mode, setMode] = useState<"personal" | "business">("personal");
  const chips = mode === "personal" ? personalChips : businessChips;
  const { heading, sub } = copy[mode];

  return (
    <div className="relative mx-auto max-w-3xl px-4 pb-4 pt-6 text-center lg:pb-6 lg:pt-12">
      <p className="rise-in mx-auto flex w-fit items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-brand-700 ring-1 ring-brand-100">
        <ShieldCheck className="h-4 w-4 text-brand-500 shrink-0" aria-hidden="true" />
        India&apos;s trusted laptop store since 2007
      </p>

      {/* Personal / Business switch — always its own row, stacked under the badge */}
      <div className="rise-in mx-auto mt-3 flex w-fit items-center gap-1 rounded-full bg-white p-1 ring-1 ring-line">
        <button
          type="button"
          onClick={() => setMode("personal")}
          aria-pressed={mode === "personal"}
          className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
            mode === "personal" ? "bg-brand-600 text-white" : "text-ink-500 hover:text-ink-900"
          }`}
        >
          For myself
        </button>
        <button
          type="button"
          onClick={() => setMode("business")}
          aria-pressed={mode === "business"}
          className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
            mode === "business" ? "bg-brand-600 text-white" : "text-ink-500 hover:text-ink-900"
          }`}
        >
          For business
        </button>
      </div>

      <h1 className="rise-in rise-in-delay-1 mt-4 font-display text-[2.4rem] font-bold leading-[1.05] tracking-tight text-ink-900 sm:text-5xl lg:mt-5 lg:text-[3.25rem]">
        {heading}
      </h1>
      <p className="rise-in rise-in-delay-2 mx-auto mt-3 max-w-lg text-sm leading-relaxed text-ink-500 sm:text-base lg:mt-4">
        {sub}
      </p>

      <div className="rise-in rise-in-delay-3 mx-auto mt-4 max-w-xl lg:mt-5">
        <SearchBox variant="hero" />
      </div>

      {/* Quick-click chips — the "different flow" per mode */}
      <div className="rise-in rise-in-delay-3 no-scrollbar mx-auto mt-4 flex max-w-full justify-center gap-2 overflow-x-auto px-1 lg:flex-wrap">
        {chips.map((c) => {
          const inner = (
            <>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                <c.Icon className="h-3 w-3" strokeWidth={2.25} aria-hidden="true" />
              </span>
              <span className="whitespace-nowrap text-xs font-semibold text-ink-700 group-hover:text-ink-900">
                {c.label}
              </span>
            </>
          );
          const cls =
            "group flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 py-2 ring-1 ring-line transition-all duration-200 hover:-translate-y-0.5 hover:ring-brand-200 hover:shadow-(--shadow-card)";
          return c.kind === "wa" ? (
            <a key={c.label} href={waLink(c.wa)} target="_blank" rel="noopener noreferrer" className={cls}>
              {inner}
            </a>
          ) : (
            <Link key={c.label} href={c.href} className={cls}>
              {inner}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
