"use client";

/** Network — 35 outlets + distributors + warehouse: territories, pincodes, capabilities, commission. */

import { useEffect, useState } from "react";
import { StatusChip, Th, Td, api } from "@/components/admin/ui";
import type { StoreNode } from "@/lib/types";

export default function AdminNetwork() {
  const [nodes, setNodes] = useState<StoreNode[]>([]);
  const [type, setType] = useState("");

  useEffect(() => {
    const q = type ? `?type=${type}` : "";
    void api<StoreNode[]>(`/api/admin/nodes${q}`).then((r) => setNodes(r.data ?? []));
  }, [type]);

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
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-line">
        <table className="min-w-full">
          <thead className="border-b border-line">
            <tr><Th>Node</Th><Th>Type</Th><Th>City</Th><Th>Territories</Th><Th>Pincodes</Th><Th>Capabilities</Th><Th>Commission</Th><Th>Status</Th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {nodes.map((n) => (
              <tr key={n.id} className="hover:bg-surface">
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
    </div>
  );
}
