"use client";

/**
 * Network — map of the whole network (click a marker or row to open the node
 * drawer: what's up at that node — live orders, repairs, capabilities).
 */

import { useEffect, useMemo, useState } from "react";
import { MapPin, Phone, X } from "lucide-react";
import { NetworkMap } from "./NetworkMap";
import { StatusChip, Th, Td, api } from "@/components/admin/ui";
import { formatINR } from "@/lib/format";
import type { Order, RepairJob, StoreNode } from "@/lib/types";

function NodeDrawer({ node, orders, repairs, onClose }: {
  node: StoreNode | null;
  orders: Order[];
  repairs: RepairJob[];
  onClose: () => void;
}) {
  const open = !!node;

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  const nodeOrders = node ? orders.filter((o) => o.fulfilments.some((f) => f.nodeId === node.id)) : [];
  const activeOrders = nodeOrders.filter((o) => !["completed", "cancelled"].includes(o.status));
  const revenue = nodeOrders.reduce((s, o) => s + o.totals.grand, 0);
  const nodeRepairs = node ? repairs.filter((j) => j.nodeId === node.id) : [];
  const openRepairs = nodeRepairs.filter((j) => !["delivered", "cancelled"].includes(j.stage));

  return (
    <>
      <div onClick={onClose} className={`fixed inset-0 z-40 bg-ink-900/25 transition-opacity duration-200 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} aria-hidden="true" />
      <aside
        role="dialog"
        aria-label="Node details"
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-(--shadow-float) transition-transform duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {node && (
          <>
            <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
              <MapPin className="h-4 w-4 text-brand-600" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-bold text-ink-900">{node.name}</span>
                <span className="block text-xs text-ink-500">{node.area}, {node.city} · <span className="uppercase">{node.type}</span></span>
              </span>
              <StatusChip value={node.status} />
              <button onClick={onClose} aria-label="Close panel" className="rounded-md p-1.5 text-ink-300 transition-colors hover:bg-surface hover:text-ink-700">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              {/* What's up — live numbers */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-surface p-3 text-center">
                  <p className="text-xl font-bold text-ink-900">{activeOrders.length}</p>
                  <p className="text-[11px] font-medium text-ink-500">open orders</p>
                </div>
                <div className="rounded-xl bg-surface p-3 text-center">
                  <p className="text-xl font-bold text-ink-900">{openRepairs.length}</p>
                  <p className="text-[11px] font-medium text-ink-500">open repairs</p>
                </div>
                <div className="rounded-xl bg-surface p-3 text-center">
                  <p className="text-xl font-bold text-ink-900">{formatINR(revenue).replace("₹", "₹")}</p>
                  <p className="text-[11px] font-medium text-ink-500">90d revenue</p>
                </div>
              </div>

              {/* Facts */}
              <section className="space-y-1.5 text-sm">
                <p className="flex items-center gap-2 text-ink-700"><Phone className="h-3.5 w-3.5 text-ink-300" /> {node.phone}</p>
                <p className="text-ink-500">{node.address}</p>
                <p className="text-xs text-ink-500">
                  Territories: {node.territories.join(", ") || "—"} · {node.pincodesServed.length ? `${node.pincodesServed.length} pincodes served` : "ships anywhere"}
                </p>
                <p className="flex flex-wrap gap-1.5 pt-1">
                  {node.serviceCapable && <span className="rounded bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700">SERVICE CENTRE</span>}
                  {node.rentalCapable && <span className="rounded bg-accent-400/25 px-2 py-0.5 text-[10px] font-bold text-warn">RENTAL FLEET</span>}
                  <span className="rounded bg-surface px-2 py-0.5 text-[10px] font-bold text-ink-500">STOCK: {node.stockSource.toUpperCase()}</span>
                  {node.commissionPct != null && <span className="rounded bg-surface px-2 py-0.5 text-[10px] font-bold text-ink-500">{node.commissionPct}% COMMISSION</span>}
                </p>
              </section>

              {/* Recent orders */}
              <section>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">Recent orders here</h3>
                {nodeOrders.slice(0, 6).map((o) => (
                  <div key={o.id} className="flex items-center justify-between border-b border-line py-1.5 text-sm last:border-0">
                    <span className="font-mono text-xs text-brand-700">{o.code}</span>
                    <span className="text-xs text-ink-500">{o.customer.name}</span>
                    <span className="text-xs font-semibold text-ink-900">{formatINR(o.totals.grand)}</span>
                    <StatusChip value={o.status} />
                  </div>
                ))}
                {!nodeOrders.length && <p className="text-xs text-ink-400">No orders routed here yet.</p>}
              </section>

              {/* Open repairs */}
              {node.serviceCapable && (
                <section>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">Repairs in the shop</h3>
                  {openRepairs.slice(0, 6).map((j) => (
                    <div key={j.id} className="flex items-center justify-between border-b border-line py-1.5 text-sm last:border-0">
                      <span className="font-mono text-xs text-brand-700">{j.code}</span>
                      <span className="max-w-36 truncate text-xs text-ink-500">{j.brand} · {j.issue}</span>
                      <StatusChip value={j.stage} />
                    </div>
                  ))}
                  {!openRepairs.length && <p className="text-xs text-ink-400">Nothing on the bench right now.</p>}
                </section>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  );
}

export default function AdminNetwork() {
  const [nodes, setNodes] = useState<StoreNode[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [repairs, setRepairs] = useState<RepairJob[]>([]);
  const [type, setType] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    void api<StoreNode[]>("/api/admin/nodes").then((r) => setNodes(r.data ?? []));
    void api<Order[]>("/api/admin/orders?limit=1000").then((r) => setOrders(r.data ?? []));
    void api<RepairJob[]>("/api/admin/repairs?limit=500").then((r) => setRepairs(r.data ?? []));
  }, []);

  const shown = useMemo(() => nodes.filter((n) => !type || n.type === type), [nodes, type]);
  const selected = nodes.find((n) => n.id === selectedId) ?? null;

  const outlets = nodes.filter((n) => n.type === "outlet").length;
  const distributors = nodes.filter((n) => n.type === "distributor").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-ink-900">Network</h1>
        <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm">
          <option value="">All nodes</option>
          <option value="outlet">Outlets</option>
          <option value="distributor">Distributors</option>
          <option value="warehouse">Warehouse</option>
        </select>
        <span className="text-xs text-ink-400">{outlets} outlets · {distributors} distributors · 1 warehouse</span>
      </div>

      <NetworkMap nodes={shown} selectedId={selectedId} onSelect={setSelectedId} />

      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-line">
        <table className="min-w-full">
          <thead className="border-b border-line">
            <tr><Th>Node</Th><Th>Type</Th><Th>City</Th><Th>Territories</Th><Th>Pincodes</Th><Th>Capabilities</Th><Th>Commission</Th><Th>Status</Th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {shown.map((n) => (
              <tr key={n.id} onClick={() => setSelectedId(n.id)}
                className={`cursor-pointer transition-colors hover:bg-surface ${selectedId === n.id ? "bg-brand-50/60" : ""}`}>
                <Td>
                  <span className="font-medium text-ink-900">{n.name}</span>
                  <span className="block text-xs text-ink-400">{n.id} · {n.phone}</span>
                </Td>
                <Td><span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-bold uppercase text-ink-600">{n.type}</span></Td>
                <Td>{n.city}<span className="ml-1 text-xs text-ink-400">{n.area}</span></Td>
                <Td><span className="max-w-40 truncate text-xs">{n.territories.join(", ")}</span></Td>
                <Td>
                  <span title={n.pincodesServed.slice(0, 20).join(", ")} className="cursor-help text-xs">
                    {n.pincodesServed.length ? `${n.pincodesServed.length} pins (${n.pincodesServed[0]}…)` : "ships anywhere"}
                  </span>
                </Td>
                <Td>
                  <span className="flex gap-1">
                    {n.serviceCapable && <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">SERVICE</span>}
                    {n.rentalCapable && <span className="rounded bg-accent-400/20 px-1.5 py-0.5 text-[10px] font-bold text-warn">RENTAL</span>}
                    <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] text-ink-500">{n.stockSource}</span>
                  </span>
                </Td>
                <Td>{n.commissionPct ? `${n.commissionPct}%` : "—"}</Td>
                <Td><StatusChip value={n.status} /></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <NodeDrawer node={selected} orders={orders} repairs={repairs} onClose={() => setSelectedId(null)} />
    </div>
  );
}
