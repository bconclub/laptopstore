"use client";

/**
 * Order drawer — slide-in right panel: where the order is (journey stepper +
 * fulfilment nodes) and what's happening (timeline, next moves). Opens from
 * any order row; full page remains at /admin/orders/[id].
 */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ExternalLink, MapPin, X } from "lucide-react";
import { StatusChip, api } from "@/components/admin/ui";
import { formatINR } from "@/lib/format";
import type { Order, StoreNode } from "@/lib/types";

const JOURNEY = ["confirmed", "processing", "ready", "dispatched", "completed"] as const;

const NEXT: Record<string, string[]> = {
  confirmed: ["processing", "cancelled"],
  processing: ["ready", "dispatched", "cancelled"],
  ready: ["dispatched", "completed", "cancelled"],
  dispatched: ["completed"],
};

const STEP_HINT: Record<string, string> = {
  confirmed: "Order placed, payment locked",
  processing: "Being picked & packed",
  ready: "Ready at the counter",
  dispatched: "Out for delivery",
  completed: "Handed to the customer",
};

function Stepper({ status }: { status: Order["status"] }) {
  if (status === "cancelled") {
    return <p className="rounded-xl bg-danger/10 px-3 py-2.5 text-sm font-semibold text-danger">Order cancelled</p>;
  }
  const idx = JOURNEY.indexOf(status as (typeof JOURNEY)[number]);
  return (
    <div>
      <div className="flex items-center">
        {JOURNEY.map((s, i) => (
          <div key={s} className="flex flex-1 items-center last:flex-none">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                i < idx ? "bg-brand-600 text-white" : i === idx ? "bg-brand-600 text-white ring-4 ring-brand-100" : "bg-surface text-ink-400 ring-1 ring-line"
              }`}
            >
              {i < idx ? "✓" : i + 1}
            </span>
            {i < JOURNEY.length - 1 && <span className={`mx-1 h-0.5 flex-1 rounded ${i < idx ? "bg-brand-600" : "bg-line"}`} />}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] font-medium text-ink-400">
        <span>{JOURNEY[0]}</span>
        <span className="font-bold text-brand-700">{status}</span>
        <span>{JOURNEY[JOURNEY.length - 1]}</span>
      </div>
      <p className="mt-1.5 text-xs text-ink-500">{STEP_HINT[status]}</p>
    </div>
  );
}

export function OrderDrawer({
  orderId,
  nodes,
  onClose,
  onChanged,
}: {
  orderId: string | null;
  nodes: Map<string, StoreNode>;
  onClose: () => void;
  onChanged?: (o: Order) => void;
}) {
  const [order, setOrder] = useState<Order | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!orderId) return;
    setOrder(null);
    setError("");
    const r = await api<Order>(`/api/admin/orders/${orderId}`);
    if (r.ok) setOrder(r.data!);
    else setError(r.error ?? "Could not load order");
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  // ESC to close
  useEffect(() => {
    if (!orderId) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [orderId, onClose]);

  async function transition(to: string) {
    if (!orderId) return;
    setBusy(to);
    setError("");
    const r = await api<Order>(`/api/admin/orders/${orderId}/transition`, { method: "POST", body: JSON.stringify({ to }) });
    if (r.ok) {
      setOrder(r.data!);
      onChanged?.(r.data!);
    } else setError(r.error ?? "Transition failed");
    setBusy("");
  }

  const open = !!orderId;
  const nodeOf = (id: string) => nodes.get(id);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-ink-900/25 transition-opacity duration-200 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        aria-hidden="true"
      />
      {/* Panel */}
      <aside
        role="dialog"
        aria-label="Order details"
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-(--shadow-float) transition-transform duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {order ? (
          <>
            {/* Header */}
            <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
              <span className="font-mono text-base font-bold text-brand-700">{order.code}</span>
              <StatusChip value={order.status} />
              <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-bold uppercase text-ink-500">{order.audience}</span>
              <span className="flex-1" />
              <Link href={`/admin/orders/${order.id}`} title="Open full page" className="rounded-md p-1.5 text-ink-300 transition-colors hover:bg-surface hover:text-ink-700">
                <ExternalLink className="h-4 w-4" />
              </Link>
              <button onClick={onClose} aria-label="Close panel" className="rounded-md p-1.5 text-ink-300 transition-colors hover:bg-surface hover:text-ink-700">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

              {/* Journey */}
              <Stepper status={order.status} />

              {/* Where it is — fulfilment nodes */}
              <section>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">
                  Where it is{order.fulfilments.length > 1 && <span className="ml-1.5 rounded bg-accent-400/20 px-1.5 py-0.5 text-[10px] font-bold text-warn">split ×{order.fulfilments.length}</span>}
                </h3>
                <div className="space-y-2">
                  {order.fulfilments.map((f) => {
                    const n = nodeOf(f.nodeId);
                    return (
                      <div key={f.id} className="rounded-xl bg-surface p-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-600" />
                          <span className="flex-1 truncate text-sm font-semibold text-ink-900">{n?.name ?? f.nodeId}</span>
                          <StatusChip value={f.status} />
                        </div>
                        <p className="mt-1 pl-5.5 text-xs text-ink-500">
                          {n ? `${n.area}, ${n.city}` : ""} · {f.mode} · {f.itemIndexes.length} item{f.itemIndexes.length > 1 ? "s" : ""}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Items */}
              <section>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">Items</h3>
                {order.items.map((it, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-line py-1.5 text-sm last:border-0">
                    <span className="min-w-0 truncate text-ink-700">
                      {it.productId}
                      {it.serial && <span className="ml-1.5 font-mono text-xs text-ink-400">{it.serial}</span>}
                    </span>
                    <span className="ml-3 shrink-0 text-ink-900">{it.qty} × {formatINR(it.unitPrice)}</span>
                  </div>
                ))}
                <div className="mt-2 flex justify-between text-sm font-bold text-ink-900">
                  <span>Total · {order.payment.method}</span>
                  <span>{formatINR(order.totals.grand)}</span>
                </div>
                {order.totals.credit > 0 && <p className="text-xs text-success">includes −{formatINR(order.totals.credit)} trade-in credit</p>}
              </section>

              {/* Customer */}
              <section>
                <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink-400">Customer</h3>
                <p className="text-sm font-medium text-ink-900">{order.customer.name}</p>
                <p className="text-xs text-ink-500">{order.customer.phone} · pincode {order.customer.pincode}</p>
              </section>

              {/* Timeline */}
              <section>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">What's happened</h3>
                <ol className="space-y-1.5 border-l-2 border-brand-100 pl-3">
                  {[...order.timeline].reverse().map((e, i) => (
                    <li key={i} className="text-xs text-ink-500">
                      <span className="font-semibold text-ink-700">{e.to.replace(/_/g, " ")}</span>
                      {" · "}
                      {new Date(e.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      <span className="ml-1 text-ink-400">by {e.by}</span>
                    </li>
                  ))}
                </ol>
              </section>
            </div>

            {/* Actions */}
            <div className="border-t border-line px-5 py-4">
              {(NEXT[order.status] ?? []).length ? (
                <div className="flex flex-wrap gap-2">
                  {(NEXT[order.status] ?? []).map((to) => (
                    <button
                      key={to}
                      disabled={!!busy}
                      onClick={() => transition(to)}
                      className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-40 ${
                        to === "cancelled"
                          ? "text-danger ring-1 ring-danger/30 hover:bg-danger/5"
                          : "bg-brand-600 text-white hover:bg-brand-700"
                      }`}
                    >
                      {busy === to ? "…" : `Move to ${to}`}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-ink-400">Order is in a terminal state — nothing left to do.</p>
              )}
            </div>
          </>
        ) : (
          <p className="p-6 text-sm text-ink-500">{error || "Loading order…"}</p>
        )}
      </aside>
    </>
  );
}
