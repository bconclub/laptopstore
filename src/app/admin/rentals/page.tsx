"use client";

/** Rentals — active/return-due first, stage transitions, deposit + tier info. */

import { useCallback, useEffect, useState } from "react";
import { StatusChip, Th, Td, api } from "@/components/admin/ui";
import { formatINR } from "@/lib/format";
import type { Rental, RentalStage } from "@/lib/types";

const NEXT: Record<string, RentalStage[]> = {
  enquiry: ["availability_confirmed", "cancelled"],
  availability_confirmed: ["agreement", "cancelled"],
  agreement: ["deposit_paid", "cancelled"],
  deposit_paid: ["dispatched", "cancelled"],
  dispatched: ["active"],
  active: ["return_due", "returned"],
  return_due: ["returned"],
  returned: ["closed"],
};

const ORDER: RentalStage[] = ["return_due", "active", "dispatched", "deposit_paid", "agreement", "availability_confirmed", "enquiry", "returned", "closed", "cancelled"];

export default function AdminRentals() {
  const [rows, setRows] = useState<Rental[]>([]);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const r = await api<Rental[]>("/api/admin/rentals?limit=200");
    const sorted = (r.data ?? []).sort((a, b) => ORDER.indexOf(a.stage) - ORDER.indexOf(b.stage));
    setRows(sorted);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function move(r: Rental, to: RentalStage) {
    const res = await api(`/api/admin/rentals/${r.id}/transition`, { method: "POST", body: JSON.stringify({ to }) });
    setMsg(res.ok ? "" : res.error ?? "failed");
    void load();
  }

  const dueCount = rows.filter((r) => r.stage === "return_due").length;
  const activeCount = rows.filter((r) => r.stage === "active").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-ink-900">Rentals</h1>
        <span className="rounded-full bg-accent-400/20 px-2.5 py-0.5 text-xs font-semibold text-warn">{dueCount} return due</span>
        <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">{activeCount} active</span>
      </div>
      {msg && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{msg}</p>}
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-line">
        <table className="min-w-full">
          <thead className="border-b border-line">
            <tr><Th>Rental</Th><Th>Customer</Th><Th>Unit</Th><Th>Window</Th><Th>Rate</Th><Th>Deposit</Th><Th>Node</Th><Th>Stage</Th><Th>Move</Th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-surface">
                <Td><span className="font-mono text-xs text-brand-700">{r.code}</span></Td>
                <Td>
                  {r.customer.name}
                  <span className="ml-1 rounded bg-surface px-1 text-[10px] uppercase text-ink-500">{r.customer.audience}</span>
                </Td>
                <Td><span className="font-mono text-xs">{r.unitId ?? "—"}</span></Td>
                <Td>{r.from} → {r.to}</Td>
                <Td>{formatINR(r.tier.perDay)}/d</Td>
                <Td>{formatINR(r.deposit)}</Td>
                <Td>{r.nodeId}</Td>
                <Td><StatusChip value={r.stage} /></Td>
                <Td>
                  <span className="flex gap-1">
                    {(NEXT[r.stage] ?? []).map((to) => (
                      <button key={to} onClick={() => move(r, to)} className={`rounded px-2 py-0.5 text-[11px] font-semibold ${to === "cancelled" ? "text-danger ring-1 ring-danger/30" : "text-brand-700 ring-1 ring-brand-200"}`}>
                        {to.replace(/_/g, " ")}
                      </button>
                    ))}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
