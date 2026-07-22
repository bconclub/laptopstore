"use client";

/** Repairs — stage board with TAT colouring + diagnosis/quote transitions. */

import { useCallback, useEffect, useState } from "react";
import { StatusChip, Th, Td, api } from "@/components/admin/ui";
import { formatINR } from "@/lib/format";
import type { RepairJob, RepairStage } from "@/lib/types";

const NEXT: Record<string, RepairStage[]> = {
  booked: ["received", "cancelled"],
  received: ["diagnosed"],
  diagnosed: ["quoted"],
  quoted: ["approved", "cancelled"],
  approved: ["in_repair"],
  in_repair: ["ready"],
  ready: ["delivered"],
};

function tatTone(j: RepairJob): string {
  if (["delivered", "cancelled"].includes(j.stage)) return "text-ink-400";
  const ageDays = (Date.now() - new Date(j.createdAt).getTime()) / 86400_000;
  if (ageDays > j.tatDays) return "font-bold text-danger";
  if (ageDays > j.tatDays * 0.7) return "font-semibold text-warn";
  return "text-success";
}

export default function AdminRepairs() {
  const [jobs, setJobs] = useState<RepairJob[]>([]);
  const [stage, setStage] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const q = stage ? `?stage=${stage}&limit=200` : "?limit=200";
    const r = await api<RepairJob[]>(`/api/admin/repairs${q}`);
    setJobs(r.data ?? []);
  }, [stage]);

  useEffect(() => {
    void load();
  }, [load]);

  async function move(j: RepairJob, to: RepairStage) {
    const patch: Record<string, unknown> = { to };
    if (to === "diagnosed") patch.diagnosis = prompt("Diagnosis note:", "Part replacement needed") ?? "diagnosed";
    if (to === "quoted") patch.quoteAmount = Number(prompt("Quote amount ₹:", "4990") ?? 0);
    const r = await api(`/api/admin/repairs/${j.id}/transition`, { method: "POST", body: JSON.stringify(patch) });
    setMsg(r.ok ? "" : r.error ?? "failed");
    void load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-ink-900">Repairs</h1>
        <select value={stage} onChange={(e) => setStage(e.target.value)} className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm">
          <option value="">All stages</option>
          {["booked", "received", "diagnosed", "quoted", "approved", "in_repair", "ready", "delivered", "cancelled"].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
        <span className="text-xs text-ink-400">{jobs.length} jobs · TAT colour: green on-track / amber near / red breached</span>
      </div>
      {msg && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{msg}</p>}
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-line">
        <table className="min-w-full">
          <thead className="border-b border-line">
            <tr><Th>Job</Th><Th>Customer</Th><Th>Device</Th><Th>Issue</Th><Th>Node</Th><Th>TAT</Th><Th>Quote</Th><Th>Stage</Th><Th>Move</Th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {jobs.map((j) => (
              <tr key={j.id} className="hover:bg-surface">
                <Td><span className="font-mono text-xs text-brand-700">{j.code}</span></Td>
                <Td>{j.customer.name}<span className="ml-1 text-xs text-ink-400">{j.customer.phone}</span></Td>
                <Td>{j.brand} {j.model}</Td>
                <Td><span className="max-w-40 truncate">{j.issue}</span></Td>
                <Td>{j.nodeId}<span className="ml-1 text-xs text-ink-400">{j.mode}</span></Td>
                <Td><span className={tatTone(j)}>{j.tatDays}d</span></Td>
                <Td>{j.quoteAmount ? formatINR(j.quoteAmount) : "—"}</Td>
                <Td><StatusChip value={j.stage} /></Td>
                <Td>
                  <span className="flex gap-1">
                    {(NEXT[j.stage] ?? []).map((to) => (
                      <button key={to} onClick={() => move(j, to)} className={`rounded px-2 py-0.5 text-[11px] font-semibold ${to === "cancelled" ? "text-danger ring-1 ring-danger/30" : "text-brand-700 ring-1 ring-brand-200"}`}>
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
