"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import type { Product } from "@/lib/types";
import ProductCard from "@/components/ProductCard";

type SortKey = "featured" | "price-asc" | "price-desc" | "rating";

const sortOptions: { key: SortKey; label: string }[] = [
  { key: "featured", label: "Featured" },
  { key: "price-asc", label: "Price: low to high" },
  { key: "price-desc", label: "Price: high to low" },
  { key: "rating", label: "Top rated" },
];

/**
 * Client-side product browser for the PLP: condition + brand chips,
 * sort, and a lightweight filter sheet on mobile. ≤8 primary filters,
 * per Baymard progressive-disclosure guidance.
 */
export default function CategoryBrowser({ products }: { products: Product[] }) {
  const [condition, setCondition] = useState<"all" | "new" | "refurbished">("all");
  const [brand, setBrand] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("featured");
  const [sheetOpen, setSheetOpen] = useState(false);

  const brands = useMemo(
    () => [...new Set(products.map((p) => p.brand))].sort(),
    [products],
  );
  const hasBothConditions = useMemo(
    () => new Set(products.map((p) => p.condition)).size > 1,
    [products],
  );

  const visible = useMemo(() => {
    let list = products;
    if (condition !== "all") list = list.filter((p) => p.condition === condition);
    if (brand !== "all") list = list.filter((p) => p.brand === brand);
    switch (sort) {
      case "price-asc":
        return [...list].sort((a, b) => a.price - b.price);
      case "price-desc":
        return [...list].sort((a, b) => b.price - a.price);
      case "rating":
        return [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      default:
        return list;
    }
  }, [products, condition, brand, sort]);

  const activeFilters = (condition !== "all" ? 1 : 0) + (brand !== "all" ? 1 : 0);

  const chips = (
    <>
      {hasBothConditions ? (
        <div className="flex items-center gap-1.5" role="group" aria-label="Condition">
          {(["all", "new", "refurbished"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCondition(c)}
              aria-pressed={condition === c}
              className={`rounded-full px-3.5 py-2 text-xs font-semibold capitalize transition-colors ${
                condition === c
                  ? "bg-ink-900 text-white"
                  : "bg-white text-ink-700 ring-1 ring-line hover:bg-surface"
              }`}
            >
              {c === "all" ? "All" : c}
            </button>
          ))}
        </div>
      ) : null}
      {brands.length > 1 ? (
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Brand">
          <button
            type="button"
            onClick={() => setBrand("all")}
            aria-pressed={brand === "all"}
            className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
              brand === "all"
                ? "bg-brand-500 text-white"
                : "bg-white text-ink-700 ring-1 ring-line hover:bg-surface"
            }`}
          >
            All brands
          </button>
          {brands.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBrand(brand === b ? "all" : b)}
              aria-pressed={brand === b}
              className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                brand === b
                  ? "bg-brand-500 text-white"
                  : "bg-white text-ink-700 ring-1 ring-line hover:bg-surface"
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-sm text-ink-500">
          <span className="font-semibold text-ink-900">{visible.length}</span>{" "}
          {visible.length === 1 ? "product" : "products"}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-semibold text-ink-700 ring-1 ring-line hover:bg-surface sm:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Filters
            {activeFilters > 0 ? (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
                {activeFilters}
              </span>
            ) : null}
          </button>
          <label className="flex items-center gap-2 text-xs text-ink-500">
            <span className="hidden sm:inline">Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-full bg-white px-3 py-2.5 text-xs font-semibold text-ink-900 ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-500"
            >
              {sortOptions.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Desktop filter chips */}
      <div className="mb-6 hidden flex-wrap items-center gap-x-5 gap-y-3 sm:flex">{chips}</div>

      {/* Grid */}
      {visible.length === 0 ? (
        <div className="rounded-2xl bg-surface px-6 py-16 text-center ring-1 ring-line">
          <p className="font-display text-lg font-semibold text-ink-900">No products match</p>
          <p className="mt-1 text-sm text-ink-500">Try clearing a filter, or call us. We stock far more than what&apos;s listed online.</p>
          <button
            type="button"
            onClick={() => {
              setCondition("all");
              setBrand("all");
            }}
            className="mt-5 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
          {visible.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {/* Mobile filter sheet */}
      {sheetOpen ? (
        <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <button
            type="button"
            aria-label="Close filters"
            className="absolute inset-0 bg-ink-900/40"
            onClick={() => setSheetOpen(false)}
          />
          <div className="pb-safe absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-5 shadow-(--shadow-float)">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" aria-hidden="true" />
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-ink-900">Filters</h2>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface"
                aria-label="Close filters"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="flex flex-col gap-4">{chips}</div>
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="mt-6 w-full rounded-full bg-brand-500 py-3.5 text-sm font-bold text-white hover:bg-brand-600"
            >
              Show {visible.length} {visible.length === 1 ? "product" : "products"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
