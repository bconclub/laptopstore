"use client";

/**
 * Purchase checkout (deck §07): contact → pincode routing plan → trade-in →
 * mock payment → confirmed. Cart lines are slug-keyed (v1); we resolve
 * slugs → product ids against the live catalog before routing.
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { formatINR } from "@/lib/format";
import type { FulfilmentPlan, Order, PaymentMethod } from "@/lib/types";

interface ResolvedLine {
  slug: string;
  name: string;
  productId: string;
  qty: number;
  price: number;
  missing?: boolean;
}

type Step = "contact" | "plan" | "payment" | "done";

const PAY_OPTIONS: { id: PaymentMethod; label: string; hint: string }[] = [
  { id: "upi", label: "UPI", hint: "GPay / PhonePe / Paytm" },
  { id: "card", label: "Card", hint: "Credit / debit" },
  { id: "emi", label: "EMI", hint: "No-cost plans on eligible laptops" },
  { id: "cod", label: "Pay at store / COD", hint: "Pay on pickup or delivery" },
];

export function CheckoutFlow() {
  const { lines, clear } = useCart();
  const [step, setStep] = useState<Step>("contact");
  const [resolved, setResolved] = useState<ResolvedLine[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pincode, setPincode] = useState("");
  const [plan, setPlan] = useState<FulfilmentPlan | null>(null);
  const [tradeIn, setTradeIn] = useState(false);
  const [tradeInCredit, setTradeInCredit] = useState(0);
  const [method, setMethod] = useState<PaymentMethod>("upi");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<Order | null>(null);

  // Resolve cart slugs → live catalog products
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const out: ResolvedLine[] = [];
      for (const l of lines) {
        try {
          const r = await fetch(`/api/catalog/products/${l.slug}`);
          const j = await r.json();
          if (j.ok) {
            out.push({ slug: l.slug, name: l.name, productId: j.data.product.id, qty: l.qty, price: j.data.product.price });
          } else {
            out.push({ slug: l.slug, name: l.name, productId: "", qty: l.qty, price: l.price, missing: true });
          }
        } catch {
          out.push({ slug: l.slug, name: l.name, productId: "", qty: l.qty, price: l.price, missing: true });
        }
      }
      if (!cancelled) setResolved(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [lines]);

  const valid = useMemo(() => resolved.filter((l) => !l.missing), [resolved]);
  const sub = valid.reduce((s, l) => s + l.qty * l.price, 0);
  const grand = Math.max(0, sub - (tradeIn ? tradeInCredit : 0));

  const contactOk = name.trim().length >= 2 && /^[6-9]\d{9}$/.test(phone) && /^\d{6}$/.test(pincode);

  async function fetchPlan() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/pincode/route", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pincode, items: valid.map((l) => ({ productId: l.productId, qty: l.qty })) }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      setPlan(j.data);
      if (tradeIn) setTradeInCredit(Math.min(8000, Math.round(sub * 0.08 / 500) * 500));
      setStep("plan");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not check your pincode");
    } finally {
      setBusy(false);
    }
  }

  async function placeOrder() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/checkout/purchase", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customer: { name, phone, pincode },
          items: valid.map((l) => ({ productId: l.productId, qty: l.qty })),
          mode: plan?.legs.every((leg) => leg.reach === "local") ? "pickup" : "delivery",
          payment: { method },
          tradeInCredit: tradeIn ? tradeInCredit : undefined,
        }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      setOrder(j.data);
      clear();
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not place the order");
    } finally {
      setBusy(false);
    }
  }

  if (!lines.length && step !== "done") {
    return (
      <div className="mt-10 rounded-2xl bg-surface p-8 text-center">
        <p className="text-ink-700">Your cart is empty.</p>
        <Link href="/category/laptops" className="mt-3 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white">
          Browse laptops
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      {/* Cart summary */}
      {step !== "done" && (
        <div className="rounded-2xl ring-1 ring-line">
          {resolved.map((l) => (
            <div key={l.slug} className="flex items-center justify-between border-b border-line px-4 py-3 last:border-0">
              <div>
                <p className="text-sm font-medium text-ink-900">{l.name}</p>
                {l.missing && <p className="text-xs text-danger">No longer available — will be skipped</p>}
              </div>
              <p className="text-sm text-ink-700">
                {l.qty} × {formatINR(l.price)}
              </p>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-3 font-semibold text-ink-900">
            <span>Total</span>
            <span>{formatINR(grand)}</span>
          </div>
        </div>
      )}

      {error && <p className="rounded-lg bg-danger/10 px-4 py-2 text-sm text-danger">{error}</p>}

      {/* Step 1: contact + pincode */}
      {step === "contact" && (
        <div className="space-y-4 rounded-2xl p-5 ring-1 ring-line">
          <h2 className="font-semibold text-ink-900">Contact & delivery pincode</h2>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name"
            className="w-full rounded-lg border border-line px-4 py-2.5 text-sm outline-none focus:border-brand-500" />
          <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="Mobile number" inputMode="numeric"
            className="w-full rounded-lg border border-line px-4 py-2.5 text-sm outline-none focus:border-brand-500" />
          <input value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Pincode (e.g. 600042)" inputMode="numeric"
            className="w-full rounded-lg border border-line px-4 py-2.5 text-sm outline-none focus:border-brand-500" />
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" checked={tradeIn} onChange={(e) => setTradeIn(e.target.checked)} className="accent-brand-600" />
            I have an old laptop to exchange (instant estimate)
          </label>
          <button disabled={!contactOk || busy || !valid.length} onClick={fetchPlan}
            className="w-full rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white disabled:opacity-40">
            {busy ? "Checking your pincode…" : "Check availability & route"}
          </button>
        </div>
      )}

      {/* Step 2: fulfilment plan */}
      {step === "plan" && plan && (
        <div className="space-y-4 rounded-2xl p-5 ring-1 ring-line">
          <h2 className="font-semibold text-ink-900">How your order reaches you</h2>
          {plan.unfulfillable.length > 0 && (
            <p className="rounded-lg bg-danger/10 px-4 py-2 text-sm text-danger">
              Some items have no stock right now and were removed from the plan.
            </p>
          )}
          {plan.legs.map((leg, i) => (
            <div key={leg.nodeId} className="rounded-xl bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                {plan.split ? `Dispatch ${i + 1} of ${plan.legs.length}` : leg.reach === "local" ? "Available near you" : "Ships to you"}
              </p>
              <p className="mt-1 text-sm font-medium text-ink-900">{leg.nodeName}</p>
              <p className="text-xs text-ink-500">
                {leg.reach === "local" ? `Pickup today or same-day delivery · ${leg.city}` : `Delivery in ~${leg.etaDays} day${leg.etaDays === 1 ? "" : "s"} from ${leg.city}`}
              </p>
            </div>
          ))}
          {plan.split && (
            <p className="text-xs text-ink-500">One order, multiple dispatches, one tracking view.</p>
          )}
          {tradeIn && tradeInCredit > 0 && (
            <p className="rounded-lg bg-success/10 px-4 py-2 text-sm text-success">
              Trade-in estimate applied: −{formatINR(tradeInCredit)} (final value at inspection)
            </p>
          )}
          <div className="flex gap-3">
            <button onClick={() => setStep("contact")} className="rounded-lg px-4 py-2.5 text-sm font-medium text-ink-700 ring-1 ring-line">Back</button>
            <button onClick={() => setStep("payment")} className="flex-1 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white">
              Continue to payment
            </button>
          </div>
        </div>
      )}

      {/* Step 3: payment (mock) */}
      {step === "payment" && (
        <div className="space-y-3 rounded-2xl p-5 ring-1 ring-line">
          <h2 className="font-semibold text-ink-900">Payment</h2>
          <p className="text-xs text-ink-500">Demo build — no money moves. Pick a method to confirm the order.</p>
          {PAY_OPTIONS.map((o) => (
            <label key={o.id} className={`flex cursor-pointer items-center justify-between rounded-xl px-4 py-3 ring-1 ${method === o.id ? "ring-brand-500 bg-brand-50" : "ring-line"}`}>
              <span className="text-sm font-medium text-ink-900">{o.label}</span>
              <span className="text-xs text-ink-500">{o.hint}</span>
              <input type="radio" name="pay" className="sr-only" checked={method === o.id} onChange={() => setMethod(o.id)} />
            </label>
          ))}
          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep("plan")} className="rounded-lg px-4 py-2.5 text-sm font-medium text-ink-700 ring-1 ring-line">Back</button>
            <button disabled={busy} onClick={placeOrder} className="flex-1 rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white disabled:opacity-40">
              {busy ? "Placing order…" : `Pay ${formatINR(grand)} & confirm`}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: done */}
      {step === "done" && order && (
        <div className="rounded-2xl bg-success/5 p-8 text-center ring-1 ring-success/30">
          <p className="text-3xl">✓</p>
          <h2 className="mt-2 text-xl font-bold text-ink-900">Order confirmed</h2>
          <p className="mt-1 font-mono text-sm text-brand-600">{order.code}</p>
          <p className="mt-3 text-sm text-ink-700">
            {order.fulfilments.length > 1
              ? `${order.fulfilments.length} dispatches on the way — one tracking view.`
              : order.fulfilments[0]?.mode === "pickup"
                ? "Ready for pickup — we'll text you when it's packed."
                : "We'll text you tracking as soon as it ships."}
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Link href="/account" className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white">Track order</Link>
            <a
              href={`https://wa.me/919500156666?text=${encodeURIComponent(`Hi, my order ${order.code} — quick question`)}`}
              className="rounded-lg px-5 py-2.5 text-sm font-medium text-ink-700 ring-1 ring-line"
            >
              WhatsApp us
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
