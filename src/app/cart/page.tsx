"use client";

import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2, MessageCircle } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { formatINR } from "@/lib/format";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function CartPage() {
  const { lines, total, setQty, remove, clear } = useCart();

  const checkoutMsg = `Hi! I'd like to order:\n${lines
    .map((l) => `• ${l.name} ×${l.qty} = ${formatINR(l.price * l.qty)}`)
    .join("\n")}\nTotal: ${formatINR(total)}`;

  return (
    <div className="mx-auto max-w-4xl px-4 pt-4">
      <Breadcrumbs items={[{ label: "Cart" }]} />
      <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
        Your cart
      </h1>

      {lines.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-3xl bg-surface px-6 py-16 text-center ring-1 ring-line">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-ink-300 ring-1 ring-line">
            <ShoppingBag className="h-7 w-7" aria-hidden="true" />
          </span>
          <p className="mt-4 font-display text-lg font-semibold text-ink-900">Your cart is empty</p>
          <p className="mt-1 max-w-xs text-sm text-ink-500">
            Browse laptops, spares and more. Your picks will appear here.
          </p>
          <Link
            href="/categories"
            className="mt-6 rounded-full bg-brand-500 px-6 py-3 text-sm font-bold text-white hover:bg-brand-600"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        <div className="mt-6">
          <ul className="divide-y divide-line rounded-2xl bg-white ring-1 ring-line">
            {lines.map((l) => (
              <li key={l.slug} className="flex items-center gap-4 p-4 sm:p-5">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/product/${l.slug}`}
                    className="line-clamp-2 text-sm font-semibold text-ink-900 hover:text-brand-600"
                  >
                    {l.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-ink-500">{l.brand}</p>
                  <p className="mt-1 text-sm font-bold text-ink-900">{formatINR(l.price)}</p>
                </div>
                <div className="flex items-center gap-1 rounded-full bg-surface p-1 ring-1 ring-line">
                  <button
                    type="button"
                    onClick={() => setQty(l.slug, l.qty - 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white"
                    aria-label={`Decrease quantity of ${l.name}`}
                  >
                    <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <span className="w-6 text-center text-sm font-semibold">{l.qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty(l.slug, l.qty + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white"
                    aria-label={`Increase quantity of ${l.name}`}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => remove(l.slug)}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-ink-300 hover:bg-danger/10 hover:text-danger"
                  aria-label={`Remove ${l.name} from cart`}
                >
                  <Trash2 className="h-4.5 w-4.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-6 rounded-2xl bg-surface p-5 ring-1 ring-line sm:p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-500">Total (incl. all taxes)</span>
              <span className="font-display text-2xl font-bold text-ink-900">{formatINR(total)}</span>
            </div>
            <p className="mt-1 text-xs text-ink-300">
              Live stock across 35 stores — your pincode picks the fastest route at checkout.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Link
                href="/checkout"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 py-3.5 text-sm font-bold text-white hover:bg-brand-700"
              >
                Checkout
              </Link>
              <a
                href={`https://wa.me/919500156666?text=${encodeURIComponent(checkoutMsg)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent-400 px-6 py-3.5 text-sm font-bold text-ink-900 hover:bg-accent-600"
              >
                <MessageCircle className="h-4.5 w-4.5" aria-hidden="true" />
                Order on WhatsApp
              </a>
              <button
                type="button"
                onClick={clear}
                className="rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-ink-700 ring-1 ring-line hover:bg-surface"
              >
                Clear cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
