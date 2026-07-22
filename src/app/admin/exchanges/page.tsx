"use client";

/**
 * Exchanges — every device coming IN. Trade-ins attached to orders (which
 * device, what credit, which order) + B2B exchange enquiries in pipeline.
 */

import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import Link from "next/link";
import { OrderDrawer } from "@/components/admin/OrderDrawer";
import { StatusChip, Th, Td, api } from "@/components/admin/ui";
import { formatINR } from "@/lib/format";
import type { Enquiry, Order, StoreNode } from "@/lib/types";

export default function AdminExchanges() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [nodes, setNodes] = useState<Map<string, StoreNode>>(new Map());
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    void api<Order[]>("/api/admin/orders?limit=1000").then((r) => setOrders((r.data ?? []).filter((o) => (o.tradeInCredit ?? 0) > 0)));
    void api<Enquiry[]>("/api/admin/enquiries?limit=200").then((r) => setEnquiries((r.data ?? []).filter((e) => e.type === "exchange")));
    void api<StoreNode[]>("/api/admin/nodes").then((r) => setNodes(new Map((r.data ?? []).map((n) => [n.id, n]))));
  }, []);

  const nodeName = (id: string) => nodes.get(id)?.name.replace(/^(Laptop Store|Dell Exclusive Store|Lenovo Exclusive Store) - /, "") ?? id;

  const totalCredit = orders.reduce((s, o) => s + (o.tradeInCredit ?? 0), 0);
  const avgCredit = orders.length ? Math.round(totalCredit / orders.length) : 0;

  const topDevices = useMemo(() => {
    const agg = new Map<string, number>();
    for (const o of orders) agg.set(o.tradeInDevice ?? "Unknown device", (agg.get(o.tradeInDevice ?? "Unknown device") ?? 0) + 1);
    return [...agg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [orders]);
  const peak = Math.max(1, ...topDevices.map(([, v]) => v));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="flex items-center gap-2 text-lg font-bold text-ink-900">
          <ArrowLeftRight className="h-4.5 w-4.5 text-brand-600" /> Exchanges
        </h1>
        <span className="text-xs text-ink-400">devices coming in against new purchases + B2B exchange deals</span>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-white p-3 ring-1 ring-line">
          <p className="text-[11px] font-semibold text-ink-500">Devices taken in</p>
          <p className="mt-1 text-xl font-bold text-ink-900">{orders.length}</p>
        </div>
        <div className="rounded-xl bg-white p-3 ring-1 ring-line">
          <p className="text-[11px] font-semibold text-ink-500">Credit issued</p>
          <p className="mt-1 text-xl font-bold text-ink-900">{formatINR(totalCredit)}</p>
        </div>
        <div className="rounded-xl bg-white p-3 ring-1 ring-line">
          <p className="text-[11px] font-semibold text-ink-500">Avg credit / device</p>
          <p className="mt-1 text-xl font-bold text-ink-900">{formatINR(avgCredit)}</p>
        </div>
      </div>

      {/* What's coming in */}
      <section className="rounded-2xl bg-white p-4 ring-1 ring-line">
        <p className="mb-3 text-sm font-semibold text-ink-900">What's coming in</p>
        <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
          {topDevices.map(([device, v]) => (
            <div key={device} className="flex items-center gap-2 px-2 py-1">
              <span className="w-44 truncate text-xs text-ink-600">{device}</span>
              <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface">
                <span className="block h-full rounded-full bg-brand-500" style={{ width: `${Math.max(3, (v / peak) * 100)}%` }} />
              </span>
              <span className="w-8 text-right text-[11px] font-medium text-ink-700">{v}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Trade-in orders */}
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-line">
        <table className="min-w-full">
          <thead className="border-b border-line">
            <tr><Th>Device in</Th><Th>Customer</Th><Th>Credit</Th><Th>Against order</Th><Th>Store</Th><Th>Order total</Th><Th>Status</Th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.map((o) => (
              <tr key={o.id} onClick={() => setOpenId(o.id)}
                className={`cursor-pointer transition-colors hover:bg-surface ${openId === o.id ? "bg-brand-50/60" : ""}`}>
                <Td><span className="font-medium text-ink-900">{o.tradeInDevice ?? "—"}</span></Td>
                <Td>{o.customer.name}<span className="ml-1 text-xs text-ink-400">{o.customer.pincode}</span></Td>
                <Td><span className="font-semibold text-success">{formatINR(o.tradeInCredit ?? 0)}</span></Td>
                <Td><span className="font-mono text-xs text-brand-700">{o.code}</span></Td>
                <Td><span className="text-xs">{nodeName(o.fulfilments[0]?.nodeId ?? "")}</span></Td>
                <Td className="font-semibold">{formatINR(o.totals.grand)}</Td>
                <Td><StatusChip value={o.status} /></Td>
              </tr>
            ))}
          </tbody>
        </table>
        {!orders.length && <p className="px-4 py-6 text-center text-sm text-ink-400">No trade-ins yet.</p>}
      </div>

      {/* B2B exchange enquiries */}
      <section className="rounded-2xl bg-white ring-1 ring-line">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm font-semibold text-ink-900">B2B exchange deals in pipeline</p>
          <Link href="/admin/enquiries" className="text-sm font-medium text-brand-700 hover:underline">Open enquiries →</Link>
        </div>
        <div className="divide-y divide-line border-t border-line">
          {enquiries.map((e) => (
            <div key={e.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="font-mono text-xs text-brand-700">{e.code}</span>
              <span className="text-ink-700">{e.contact.company ?? e.contact.name}</span>
              <span className="text-xs text-ink-400">{e.items.reduce((s, it) => s + it.qty, 0)} units</span>
              <StatusChip value={e.stage} />
            </div>
          ))}
          {!enquiries.length && <p className="px-4 py-4 text-sm text-ink-400">No exchange enquiries right now.</p>}
        </div>
      </section>

      <OrderDrawer orderId={openId} nodes={nodes} onClose={() => setOpenId(null)}
        onChanged={(u) => setOrders((prev) => prev.map((o) => (o.id === u.id ? u : o)))} />
    </div>
  );
}
