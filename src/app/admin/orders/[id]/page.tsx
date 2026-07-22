"use client";

/** Order detail — items, split fulfilments, timeline, role-scoped transitions. */

import { use, useCallback, useEffect, useState } from "react";
import { StatusChip, api } from "@/components/admin/ui";
import { formatINR } from "@/lib/format";
import type { Order } from "@/lib/types";

const NEXT: Record<string, string[]> = {
  confirmed: ["processing", "cancelled"],
  processing: ["ready", "dispatched", "cancelled"],
  ready: ["dispatched", "completed", "cancelled"],
  dispatched: ["completed"],
};

export default function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    const r = await api<Order>(`/api/admin/orders/${id}`);
    if (r.ok) setOrder(r.data!);
    else setError(r.error ?? "not found");
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function transition(to: string) {
    setBusy(to);
    setError("");
    const r = await api<Order>(`/api/admin/orders/${id}/transition`, { method: "POST", body: JSON.stringify({ to }) });
    if (r.ok) setOrder(r.data!);
    else setError(r.error ?? "failed");
    setBusy("");
  }

  if (!order) return <p className="p-4 text-sm text-ink-500">{error || "Loading…"}</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <h1 className="font-mono text-lg font-bold text-brand-700">{order.code}</h1>
        <StatusChip value={order.status} />
        <span className="rounded bg-surface px-2 py-0.5 text-xs font-bold uppercase text-ink-500">{order.audience}</span>
        {order.sourceEnquiryId && <span className="text-xs text-ink-400">from enquiry {order.sourceEnquiryId}</span>}
      </div>
      {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="rounded-2xl bg-white p-4 ring-1 ring-line lg:col-span-2">
          <h2 className="mb-3 text-sm font-bold text-ink-900">Items</h2>
          {order.items.map((it, i) => (
            <div key={i} className="flex items-center justify-between border-b border-line py-2 text-sm last:border-0">
              <span>
                {it.productId}
                {it.serial && <span className="ml-2 font-mono text-xs text-ink-400">{it.serial}</span>}
                <span className="ml-2 rounded bg-surface px-1.5 py-0.5 text-[10px] uppercase text-ink-500">{it.line}</span>
              </span>
              <span>{it.qty} × {formatINR(it.unitPrice)}</span>
            </div>
          ))}
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between text-ink-500"><span>Subtotal</span><span>{formatINR(order.totals.sub)}</span></div>
            {order.totals.credit > 0 && <div className="flex justify-between text-success"><span>Trade-in credit</span><span>−{formatINR(order.totals.credit)}</span></div>}
            <div className="flex justify-between font-bold text-ink-900"><span>Total ({order.payment.method}{order.gstInvoice ? ` · ${order.gstInvoice.number}` : ""})</span><span>{formatINR(order.totals.grand)}</span></div>
          </div>

          <h2 className="mb-2 mt-5 text-sm font-bold text-ink-900">Fulfilment {order.fulfilments.length > 1 && <span className="ml-1 rounded bg-accent-400/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-warn">split</span>}</h2>
          {order.fulfilments.map((f) => (
            <div key={f.id} className="mb-2 rounded-xl bg-surface p-3 text-sm">
              <span className="font-medium text-ink-900">{f.nodeId}</span>
              <span className="ml-2 text-ink-500">{f.mode} · items [{f.itemIndexes.join(", ")}]</span>
              <StatusChip value={f.status} />
            </div>
          ))}
        </section>

        <section className="rounded-2xl bg-white p-4 ring-1 ring-line">
          <h2 className="mb-3 text-sm font-bold text-ink-900">Move order</h2>
          <div className="flex flex-wrap gap-2">
            {(NEXT[order.status] ?? []).map((to) => (
              <button
                key={to}
                disabled={!!busy}
                onClick={() => transition(to)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${to === "cancelled" ? "text-danger ring-1 ring-danger/30" : "bg-brand-600 text-white"} disabled:opacity-40`}
              >
                {busy === to ? "…" : `→ ${to}`}
              </button>
            ))}
            {!(NEXT[order.status] ?? []).length && <p className="text-xs text-ink-400">Terminal state.</p>}
          </div>

          <h2 className="mb-2 mt-5 text-sm font-bold text-ink-900">Customer</h2>
          <p className="text-sm text-ink-700">{order.customer.name}</p>
          <p className="text-xs text-ink-500">{order.customer.phone} · {order.customer.pincode}</p>

          <h2 className="mb-2 mt-5 text-sm font-bold text-ink-900">Timeline</h2>
          <ol className="space-y-1.5 border-l-2 border-brand-100 pl-3">
            {order.timeline.map((e, i) => (
              <li key={i} className="text-xs text-ink-500">
                <span className="font-medium text-ink-700">{e.to}</span> · {new Date(e.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                <span className="ml-1 text-ink-400">by {e.by}</span>
                {e.note && <span className="block text-ink-400">{e.note}</span>}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
