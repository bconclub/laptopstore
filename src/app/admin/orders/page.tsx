"use client";

/**
 * Orders — command view. Top panel: status breakdown (click to filter),
 * 30-day order trend, top stores (click to filter). All panels + the table
 * read the same filter state; row click opens the right drawer.
 */

import { useEffect, useMemo, useState } from "react";
import { OrderDrawer } from "@/components/admin/OrderDrawer";
import { StatusChip, Th, Td, api } from "@/components/admin/ui";
import { formatINR } from "@/lib/format";
import type { Order, OrderStatus, StoreNode } from "@/lib/types";

const STATUS_ORDER: OrderStatus[] = ["confirmed", "processing", "ready", "dispatched", "completed", "cancelled"];

const STATUS_META: Record<OrderStatus, { label: string; dot: string }> = {
  confirmed: { label: "Confirmed", dot: "bg-brand-500" },
  processing: { label: "Processing", dot: "bg-brand-300" },
  ready: { label: "Ready", dot: "bg-accent-400" },
  dispatched: { label: "In transit", dot: "bg-warn" },
  completed: { label: "Completed", dot: "bg-success" },
  cancelled: { label: "Cancelled", dot: "bg-danger" },
};

/** Daily order-count bars for the last 30 days of the filtered set. */
function TrendBars({ orders }: { orders: Order[] }) {
  const days = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      map.set(new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10), 0);
    }
    for (const o of orders) {
      const d = o.createdAt.slice(0, 10);
      if (map.has(d)) map.set(d, (map.get(d) ?? 0) + 1);
    }
    return [...map.entries()];
  }, [orders]);
  const peak = Math.max(1, ...days.map(([, v]) => v));
  return (
    <div className="flex h-20 items-end gap-[3px]" aria-label="Orders per day, last 30 days">
      {days.map(([date, v]) => (
        <div
          key={date}
          title={`${new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}: ${v} order${v === 1 ? "" : "s"}`}
          className={`flex-1 rounded-t ${v ? "bg-brand-500 hover:bg-brand-600" : "bg-surface"}`}
          style={{ height: `${Math.max(4, (v / peak) * 100)}%` }}
        />
      ))}
    </div>
  );
}

export default function AdminOrders() {
  const [all, setAll] = useState<Order[]>([]);
  const [nodes, setNodes] = useState<Map<string, StoreNode>>(new Map());
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [audience, setAudience] = useState("");
  const [nodeId, setNodeId] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    void api<StoreNode[]>("/api/admin/nodes").then((r) => setNodes(new Map((r.data ?? []).map((n) => [n.id, n]))));
    void api<Order[]>("/api/admin/orders?limit=1000").then((r) => setAll(r.data ?? []));
  }, []);

  const nodeName = (id: string) => nodes.get(id)?.name.replace(/^(Laptop Store|Dell Exclusive Store) - /, "") ?? id;
  const primaryNode = (o: Order) => o.fulfilments[0]?.nodeId ?? "";

  // audience+node applied (status distribution shown across these)
  const base = useMemo(
    () => all.filter((o) => (!audience || o.audience === audience) && (!nodeId || o.fulfilments.some((f) => f.nodeId === nodeId))),
    [all, audience, nodeId],
  );
  // full filter for chart + table
  const filtered = useMemo(() => base.filter((o) => !status || o.status === status), [base, status]);

  const counts = useMemo(() => {
    const c = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<OrderStatus, number>;
    for (const o of base) c[o.status]++;
    return c;
  }, [base]);

  const topStores = useMemo(() => {
    const agg = new Map<string, { revenue: number; count: number }>();
    for (const o of base.filter((o) => !status || o.status === status)) {
      const n = primaryNode(o);
      if (!n) continue;
      const e = agg.get(n) ?? { revenue: 0, count: 0 };
      e.revenue += o.totals.grand;
      e.count += 1;
      agg.set(n, e);
    }
    return [...agg.entries()].sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 6);
  }, [base, status]);

  const peakRevenue = Math.max(1, ...topStores.map(([, v]) => v.revenue));

  return (
    <div className="space-y-4">
      {/* Header + filters */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-bold text-ink-900">Orders</h1>
        <select value={audience} onChange={(e) => setAudience(e.target.value)} className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm">
          <option value="">B2C + B2B</option>
          <option value="b2c">B2C</option>
          <option value="b2b">B2B</option>
        </select>
        {nodeId && (
          <button onClick={() => setNodeId("")} className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100">
            {nodeName(nodeId)} ✕
          </button>
        )}
        {status && (
          <button onClick={() => setStatus("")} className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100">
            {STATUS_META[status].label} ✕
          </button>
        )}
        <span className="text-xs text-ink-400">{filtered.length} of {all.length} orders</span>
      </div>

      {/* Status breakdown — click to filter */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {STATUS_ORDER.map((s) => {
          const active = status === s;
          return (
            <button
              key={s}
              onClick={() => setStatus(active ? "" : s)}
              className={`rounded-xl bg-white p-3 text-left ring-1 transition-all duration-150 ${
                active ? "ring-2 ring-brand-500" : "ring-line hover:ring-brand-300"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${STATUS_META[s].dot}`} />
                <span className="text-[11px] font-semibold text-ink-500">{STATUS_META[s].label}</span>
              </span>
              <span className="mt-1 block text-xl font-bold text-ink-900">{counts[s]}</span>
            </button>
          );
        })}
      </div>

      {/* Trend + top stores */}
      <div className="grid gap-4 lg:grid-cols-5">
        <section className="rounded-2xl bg-white p-4 ring-1 ring-line lg:col-span-3">
          <div className="mb-3 flex items-baseline justify-between">
            <p className="text-sm font-semibold text-ink-900">Orders per day · last 30 days</p>
            <p className="text-xs text-ink-400">
              {filtered.length} orders · {formatINR(filtered.reduce((s, o) => s + o.totals.grand, 0))}
            </p>
          </div>
          <TrendBars orders={filtered} />
        </section>

        <section className="rounded-2xl bg-white p-4 ring-1 ring-line lg:col-span-2">
          <p className="mb-3 text-sm font-semibold text-ink-900">Top stores {status && <span className="font-normal text-ink-400">· {STATUS_META[status].label.toLowerCase()}</span>}</p>
          <div className="space-y-1.5">
            {topStores.map(([id, v]) => {
              const active = nodeId === id;
              return (
                <button
                  key={id}
                  onClick={() => setNodeId(active ? "" : id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${active ? "bg-brand-50" : "hover:bg-surface"}`}
                >
                  <span className={`w-32 truncate text-xs ${active ? "font-bold text-brand-700" : "text-ink-600"}`}>{nodeName(id)}</span>
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface">
                    <span className="block h-full rounded-full bg-brand-500" style={{ width: `${Math.max(3, (v.revenue / peakRevenue) * 100)}%` }} />
                  </span>
                  <span className="w-16 text-right text-[11px] font-medium text-ink-700">{v.count} ord</span>
                </button>
              );
            })}
            {!topStores.length && <p className="text-xs text-ink-400">No orders in this view.</p>}
          </div>
        </section>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-line">
        <table className="min-w-full">
          <thead className="border-b border-line">
            <tr>
              <Th>Order</Th><Th>Customer</Th><Th>Items</Th><Th>Store</Th><Th>Fulfilment</Th><Th>Payment</Th><Th>Total</Th><Th>Status</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.slice(0, 150).map((o) => (
              <tr
                key={o.id}
                onClick={() => setOpenId(o.id)}
                className={`cursor-pointer transition-colors hover:bg-surface ${openId === o.id ? "bg-brand-50/60" : ""}`}
              >
                <Td>
                  <span className="font-mono text-brand-700">{o.code}</span>
                  <span className="ml-2 rounded bg-surface px-1.5 py-0.5 text-[10px] font-bold uppercase text-ink-500">{o.audience}</span>
                </Td>
                <Td>{o.customer.name}<span className="ml-1 text-xs text-ink-400">{o.customer.pincode}</span></Td>
                <Td>
                  {o.items.length} item{o.items.length > 1 ? "s" : ""}
                  {o.items.some((i) => i.serial) && <span className="ml-1 font-mono text-xs text-ink-400">{o.items.find((i) => i.serial)?.serial}</span>}
                </Td>
                <Td><span className="text-xs">{nodeName(primaryNode(o))}</span></Td>
                <Td>
                  {o.fulfilments.length > 1
                    ? <span className="rounded bg-accent-400/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-warn">split ×{o.fulfilments.length}</span>
                    : o.fulfilments[0]?.mode}
                </Td>
                <Td>{o.payment.method}<span className="ml-1 text-xs text-ink-400">{o.payment.status}</span></Td>
                <Td className="font-semibold">{formatINR(o.totals.grand)}</Td>
                <Td><StatusChip value={o.status} /></Td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 150 && <p className="px-4 py-2 text-xs text-ink-400">Showing first 150 of {filtered.length} — narrow with the filters above.</p>}
      </div>

      <OrderDrawer
        orderId={openId}
        nodes={nodes}
        onClose={() => setOpenId(null)}
        onChanged={(u) => setAll((prev) => prev.map((o) => (o.id === u.id ? u : o)))}
      />
    </div>
  );
}
