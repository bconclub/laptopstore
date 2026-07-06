"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X, Wrench } from "lucide-react";
import { products } from "@/data/products";
import { flattenCategories } from "@/data/categories";
import { formatINR } from "@/lib/format";

/** Words that signal the user wants a repair/service, not to buy a product. */
const REPAIR_RE =
  /(repair|fix(?:ing|ed)?|broken|break|damage|crack|replace|replacement|service|servicing|dead|not\s*work|does\s*n.?t\s*work|won.?t|wont|turn\s*on|power\s*on|no\s*display|blank\s*screen|slow|hang|overheat|heating|water|liquid|spill|upgrade|reinstall)/i;

/** Instant search over products + categories, with repair-intent routing. */
export default function SearchBox({ variant = "header" }: { variant?: "header" | "hero" }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const query = q.trim();
  const repairIntent = query.length >= 3 && REPAIR_RE.test(query);

  const results = useMemo(() => {
    const ql = query.toLowerCase();
    if (ql.length < 2) return { products: [], categories: [] };
    const terms = ql.split(/\s+/).filter((t) => !REPAIR_RE.test(t)); // ignore intent words when matching stock
    const match = (hay: string) => (terms.length ? terms.every((t) => hay.includes(t)) : false);
    const prods = products.filter((p) => match(`${p.name} ${p.brand} ${p.condition}`.toLowerCase())).slice(0, 5);
    const cats = flattenCategories()
      .filter((c) => (terms.length ? terms.some((t) => c.name.toLowerCase().includes(t)) : c.name.toLowerCase().includes(ql)))
      .slice(0, 3);
    return { products: prods, categories: cats };
  }, [query]);

  const stockCount = results.products.length + results.categories.length;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const onEnter = () => {
    if (repairIntent) return go(`/service?q=${encodeURIComponent(query)}`);
    if (results.categories[0]) return go(`/category/${results.categories[0].slug}`);
    if (results.products[0]) return go(`/product/${results.products[0].slug}`);
  };

  const isHero = variant === "hero";
  const showPanel = open && query.length >= 2;

  return (
    <div ref={boxRef} className="relative w-full">
      <div
        className={`flex items-center gap-2 rounded-full bg-white ring-1 transition-all ${
          isHero
            ? "px-5 py-4 shadow-(--shadow-card-hover) ring-brand-100 focus-within:ring-2 focus-within:ring-brand-500"
            : "px-4 py-2.5 ring-line focus-within:ring-2 focus-within:ring-brand-500"
        }`}
      >
        <Search className="h-5 w-5 shrink-0 text-ink-300" aria-hidden="true" />
        <input
          type="search"
          role="combobox"
          aria-expanded={showPanel}
          aria-label="Search products, or describe a repair"
          placeholder="Search a model, part, or repair issue…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "Enter") onEnter();
            if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, stockCount - 1));
            if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, -1));
          }}
          className="w-full bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-300"
        />
        {q ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQ("");
              setOpen(false);
            }}
            className="rounded-full p-1 text-ink-300 hover:bg-surface hover:text-ink-700"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {showPanel ? (
        <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl bg-white shadow-(--shadow-float) ring-1 ring-line">
          {/* Repair intent — surfaced first */}
          {repairIntent ? (
            <Link
              href={`/service?q=${encodeURIComponent(query)}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 border-b border-line bg-brand-50/60 px-5 py-3 hover:bg-brand-50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
                <Wrench className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink-900">Book a repair</span>
                <span className="block truncate text-xs text-ink-500">Sounds like a service need — we&apos;ll fix it</span>
              </span>
              <span className="ml-auto shrink-0 text-xs font-semibold text-brand-600">Start →</span>
            </Link>
          ) : null}

          {stockCount === 0 ? (
            repairIntent ? null : (
              <p className="px-5 py-4 text-sm text-ink-500">
                No products match “{q}”. Try a brand, model or part — or{" "}
                <Link href="/service" onClick={() => setOpen(false)} className="font-semibold text-brand-600 hover:underline">
                  book a repair
                </Link>
                .
              </p>
            )
          ) : (
            <ul className="max-h-96 overflow-y-auto py-2">
              {results.categories.map((c, i) => (
                <li key={c.slug}>
                  <Link
                    href={`/category/${c.slug}`}
                    onClick={() => setOpen(false)}
                    className={`flex items-center justify-between px-5 py-2.5 text-sm hover:bg-brand-50 ${active === i ? "bg-brand-50" : ""}`}
                  >
                    <span className="font-medium text-ink-900">{c.name}</span>
                    <span className="text-xs text-ink-300">Category</span>
                  </Link>
                </li>
              ))}
              {results.products.map((p, i) => (
                <li key={p.slug}>
                  <Link
                    href={`/product/${p.slug}`}
                    onClick={() => setOpen(false)}
                    className={`flex items-center justify-between gap-3 px-5 py-2.5 text-sm hover:bg-brand-50 ${active === results.categories.length + i ? "bg-brand-50" : ""}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-ink-900">{p.name}</span>
                      <span className="text-xs text-ink-500">
                        {p.brand} · {p.condition === "refurbished" ? "Refurbished" : "New"}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-brand-600">{formatINR(p.price)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
