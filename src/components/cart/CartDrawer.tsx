"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2, X, MessageCircle } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { formatINR } from "@/lib/format";

/** Left slide-in cart panel. Opens on add-to-cart and from the header icon. */
export default function CartDrawer() {
  const { lines, total, setQty, remove, isDrawerOpen, closeDrawer } = useCart();

  // Lock body scroll + close on Escape while open
  useEffect(() => {
    if (!isDrawerOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [isDrawerOpen, closeDrawer]);

  const checkoutMsg = `Hi! I'd like to order:\n${lines
    .map((l) => `• ${l.name} ×${l.qty} = ${formatINR(l.price * l.qty)}`)
    .join("\n")}\nTotal: ${formatINR(total)}`;

  return (
    <div
      className={`fixed inset-0 z-50 ${isDrawerOpen ? "" : "pointer-events-none"}`}
      role="dialog"
      aria-modal="true"
      aria-label="Cart"
      aria-hidden={!isDrawerOpen}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close cart"
        onClick={closeDrawer}
        className={`absolute inset-0 bg-space-950/40 transition-opacity duration-300 ${
          isDrawerOpen ? "opacity-100" : "opacity-0"
        }`}
        tabIndex={isDrawerOpen ? 0 : -1}
      />

      {/* Panel — slides in from the right */}
      <aside
        className={`absolute inset-y-0 right-0 flex w-[92%] max-w-md flex-col bg-white shadow-(--shadow-float) transition-transform duration-300 ease-out ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-lg font-bold text-ink-900">
            Your cart{lines.length > 0 ? ` (${lines.reduce((n, l) => n + l.qty, 0)})` : ""}
          </h2>
          <button
            type="button"
            onClick={closeDrawer}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface"
            aria-label="Close cart"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface text-ink-300">
              <ShoppingBag className="h-7 w-7" aria-hidden="true" />
            </span>
            <p className="font-display text-base font-semibold text-ink-900">Your cart is empty</p>
            <p className="text-sm text-ink-500">Add a laptop, a spare part, anything you like.</p>
            <button
              type="button"
              onClick={closeDrawer}
              className="mt-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
            >
              Keep browsing
            </button>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
              {lines.map((l) => (
                <li key={l.slug} className="flex items-center gap-3 py-4">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/product/${l.slug}`}
                      onClick={closeDrawer}
                      className="line-clamp-2 text-sm font-semibold text-ink-900 hover:text-brand-600"
                    >
                      {l.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-ink-500">{l.brand}</p>
                    <p className="mt-1 text-sm font-bold text-brand-600">{formatINR(l.price)}</p>
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-surface p-1 ring-1 ring-line">
                    <button
                      type="button"
                      onClick={() => setQty(l.slug, l.qty - 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white"
                      aria-label={`Decrease quantity of ${l.name}`}
                    >
                      <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <span className="w-5 text-center text-sm font-semibold">{l.qty}</span>
                    <button
                      type="button"
                      onClick={() => setQty(l.slug, l.qty + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white"
                      aria-label={`Increase quantity of ${l.name}`}
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(l.slug)}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-ink-300 hover:bg-danger/10 hover:text-danger"
                    aria-label={`Remove ${l.name} from cart`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>

            <div className="border-t border-line p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-500">Total (incl. taxes)</span>
                <span className="font-display text-xl font-bold text-ink-900">{formatINR(total)}</span>
              </div>
              <a
                href={`https://wa.me/919500156666?text=${encodeURIComponent(checkoutMsg)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent-400 px-6 py-3.5 text-sm font-bold text-ink-900 hover:bg-accent-600"
              >
                <MessageCircle className="h-4.5 w-4.5" aria-hidden="true" />
                Order on WhatsApp
              </a>
              <Link
                href="/cart"
                onClick={closeDrawer}
                className="mt-2 block text-center text-sm font-semibold text-brand-600 hover:underline"
              >
                View full cart
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
