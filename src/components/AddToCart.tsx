"use client";

import { useState } from "react";
import { Check, MessageCircle, ShoppingBag } from "lucide-react";
import type { Product } from "@/lib/types";
import { useCart } from "@/components/cart/CartProvider";
import { formatINR } from "@/lib/format";

function useAddFeedback(product: Product) {
  const { add, openDrawer } = useCart();
  const [added, setAdded] = useState(false);
  const onAdd = () => {
    add({ slug: product.slug, name: product.name, brand: product.brand, price: product.price });
    setAdded(true);
    openDrawer();
    setTimeout(() => setAdded(false), 1600);
  };
  return { added, onAdd };
}

export function AddToCartButton({ product }: { product: Product }) {
  const { added, onAdd } = useAddFeedback(product);
  const out = product.stock === "out";
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      {/* Primary CTA: Logo Yellow + black text (Retail Precision) */}
      <button
        type="button"
        onClick={onAdd}
        disabled={out}
        className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-8 py-3.5 text-sm font-bold transition-all active:scale-[0.98] ${
          added
            ? "bg-success text-white"
            : "bg-accent-400 text-ink-900 hover:bg-accent-600 disabled:cursor-not-allowed disabled:bg-ink-300 disabled:text-white"
        }`}
      >
        {added ? (
          <>
            <Check className="h-4.5 w-4.5" aria-hidden="true" /> Added to cart
          </>
        ) : (
          <>
            <ShoppingBag className="h-4.5 w-4.5" aria-hidden="true" />
            {out ? "Out of stock" : "Add to cart"}
          </>
        )}
      </button>
      <a
        href={`https://wa.me/919500156666?text=${encodeURIComponent(
          `Hi! I'm interested in the ${product.name} (${formatINR(product.price)}) on your website.`,
        )}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-8 py-3.5 text-sm font-bold text-white transition-colors hover:bg-brand-700"
      >
        <MessageCircle className="h-4.5 w-4.5" aria-hidden="true" />
        Shop on WhatsApp
      </a>
    </div>
  );
}

/** Mobile-only sticky purchase bar, the CTA never scrolls out of reach. */
export function StickyBuyBar({ product }: { product: Product }) {
  const { added, onAdd } = useAddFeedback(product);
  const out = product.stock === "out";
  return (
    <div className="pb-safe fixed inset-x-0 bottom-14 z-30 border-t border-line bg-white/95 px-4 py-2.5 lg:hidden">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-ink-500">{product.name}</p>
          <p className="text-base font-bold text-ink-900">{formatINR(product.price)}</p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          disabled={out}
          className={`shrink-0 rounded-lg px-6 py-3 text-sm font-bold transition-all active:scale-[0.97] ${
            added
              ? "bg-success text-white"
              : "bg-accent-400 text-ink-900 hover:bg-accent-600 disabled:bg-ink-300 disabled:text-white"
          }`}
        >
          {added ? "Added ✓" : out ? "Out of stock" : "Add to cart"}
        </button>
      </div>
    </div>
  );
}
