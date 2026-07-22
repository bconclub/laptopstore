"use client";

/** Orders table — filters, split badges, serials; row click opens the right-panel drawer. */

import { useEffect, useState } from "react";
import { OrderDrawer } from "@/components/admin/OrderDrawer";
import { StatusChip, Th, Td, api } from "@/components/admin/ui";
import { formatINR } from "@/lib/format";
import type { Order, OrderStatus, StoreNode } from "@/lib/types";

const STATUSES: (OrderStatus | "")[] = ["", "confirmed", "processing", "ready", "dispatched", "completed", "cancelled"];

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [nodes, setNodes] = useState<Map<string, StoreNode>>(new Map());
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [audience, setAudience] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    void api<StoreNode[]>("/api/admin/nodes").then((r) => setNodes(new Map((r.data ?? []).map((n) => [n.id, n]))));
  }, []);

  useEffect(() => {
    const q = new URLSearchParams();
    if (status) q.set("status", status);
    if (audience) q.set("audience", audience);
    q.set("limit", "150");
    void api<Order[]>(`/api/admin/orders?${q}`).then((r) => setOrders(r.data ?? []));
  }, [status, audience]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-ink-900">Orders</h1>
        <select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | "")} className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm">
          {STATUSES.map((s) => <option key={s} value={s}>{s || "All statuses"}</option>)}
        </select>
        <select value={audience} onChange={(e) => setAudience(e.target.value)} className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm">
          <option value="">B2C + B2B</option>
          <option value="b2c">B2C</option>
          <option value="b2b">B2B</option>
        </select>
        <span className="text-xs text-ink-400">{orders.length} shown</span>
      </div>
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-line">
        <table className="min-w-full">
          <thead className="border-b border-line">
            <tr>
              <Th>Order</Th><Th>Customer</Th><Th>Items</Th><Th>Fulfilment</Th><Th>Payment</Th><Th>Total</Th><Th>Status</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.map((o) => (
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
      </div>

      <OrderDrawer
        orderId={openId}
        nodes={nodes}
        onClose={() => setOpenId(null)}
        onChanged={(updated) => setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))}
      />
    </div>
  );
}
