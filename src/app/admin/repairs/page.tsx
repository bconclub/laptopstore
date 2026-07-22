"use client";

/**
 * Repairs — command view. Top panel: pipeline stage cards (click to filter),
 * TAT health, top issues. Row click opens the repair drawer.
 */

import { useEffect, useMemo, useState } from "react";
import { RepairDrawer } from "@/components/admin/RepairDrawer";
import { StatusChip, Th, Td, api } from "@/components/admin/ui";
import { formatINR } from "@/lib/format";
import type { RepairJob, RepairStage, StoreNode } from "@/lib/types";

/** Aggregated pipeline cards — each filters to a set of stages. */
const CARDS: { label: string; stages: RepairStage[]; dot: string }[] = [
  { label: "Booked", stages: ["booked"], dot: "bg-brand-300" },
  { label: "In diagnosis", stages: ["received", "diagnosed"], dot: "bg-brand-500" },
  { label: "Awaiting approval", stages: ["quoted"], dot: "bg-accent-400" },
  { label: "In repair", stages: ["approved", "in_repair"], dot: "bg-warn" },
  { label: "Ready", stages: ["ready"], dot: "bg-success" },
  { label: "Closed", stages: ["delivered", "cancelled"], dot: "bg-ink-300" },
];

function ageDays(j: RepairJob): number {
  return (Date.now() - new Date(j.createdAt).getTime()) / 86400_000;
}

function tatTone(j: RepairJob): string {
  if (["delivered", "cancelled"].includes(j.stage)) return "text-ink-400";
  const a = ageDays(j);
  if (a > j.tatDays) return "font-bold text-danger";
  if (a > j.tatDays * 0.7) return "font-semibold text-warn";
  return "text-success";
}

export default function AdminRepairs() {
  const [jobs, setJobs] = useState<RepairJob[]>([]);
  const [nodes, setNodes] = useState<Map<string, StoreNode>>(new Map());
  const [card, setCard] = useState("");
  const [issue, setIssue] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    void api<StoreNode[]>("/api/admin/nodes").then((r) => setNodes(new Map((r.data ?? []).map((n) => [n.id, n]))));
    void api<RepairJob[]>("/api/admin/repairs?limit=500").then((r) => setJobs(r.data ?? []));
  }, []);

  const nodeName = (id: string) => nodes.get(id)?.name.replace(/^(Laptop Store|Dell Exclusive Store|Lenovo Exclusive Store) - /, "") ?? id;

  const activeStages = CARDS.find((c) => c.label === card)?.stages;
  const filtered = useMemo(
    () => jobs.filter((j) => (!activeStages || activeStages.includes(j.stage)) && (!issue || j.issue === issue)),
    [jobs, activeStages, issue],
  );

  const counts = useMemo(
    () => Object.fromEntries(CARDS.map((c) => [c.label, jobs.filter((j) => c.stages.includes(j.stage)).length])),
    [jobs],
  );

  const openJobs = jobs.filter((j) => !["delivered", "cancelled"].includes(j.stage));
  const breached = openJobs.filter((j) => ageDays(j) > j.tatDays).length;

  const topIssues = useMemo(() => {
    const agg = new Map<string, number>();
    for (const j of jobs.filter((j) => !activeStages || activeStages.includes(j.stage))) {
      agg.set(j.issue, (agg.get(j.issue) ?? 0) + 1);
    }
    return [...agg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [jobs, activeStages]);
  const peakIssue = Math.max(1, ...topIssues.map(([, v]) => v));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-bold text-ink-900">Repairs</h1>
        {card && (
          <button onClick={() => setCard("")} className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100">
            {card} ✕
          </button>
        )}
        {issue && (
          <button onClick={() => setIssue("")} className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100">
            {issue} ✕
          </button>
        )}
        <span className="text-xs text-ink-400">{filtered.length} of {jobs.length} jobs</span>
        <span className="flex-1" />
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${breached ? "bg-danger/10 text-danger" : "bg-success/10 text-success"}`}>
          {breached ? `${breached} job${breached > 1 ? "s" : ""} past TAT` : "All open jobs within TAT"}
        </span>
      </div>

      {/* Stage cards */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {CARDS.map((c) => {
          const active = card === c.label;
          return (
            <button
              key={c.label}
              onClick={() => setCard(active ? "" : c.label)}
              className={`rounded-xl bg-white p-3 text-left ring-1 transition-all duration-150 ${active ? "ring-2 ring-brand-500" : "ring-line hover:ring-brand-300"}`}
            >
              <span className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${c.dot}`} />
                <span className="text-[11px] font-semibold text-ink-500">{c.label}</span>
              </span>
              <span className="mt-1 block text-xl font-bold text-ink-900">{counts[c.label]}</span>
            </button>
          );
        })}
      </div>

      {/* Top issues — what kind of repairs are going on */}
      <section className="rounded-2xl bg-white p-4 ring-1 ring-line">
        <p className="mb-3 text-sm font-semibold text-ink-900">What's coming in {card && <span className="font-normal text-ink-400">· {card.toLowerCase()}</span>}</p>
        <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
          {topIssues.map(([iss, v]) => {
            const active = issue === iss;
            return (
              <button key={iss} onClick={() => setIssue(active ? "" : iss)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${active ? "bg-brand-50" : "hover:bg-surface"}`}>
                <span className={`w-44 truncate text-xs ${active ? "font-bold text-brand-700" : "text-ink-600"}`}>{iss}</span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface">
                  <span className="block h-full rounded-full bg-brand-500" style={{ width: `${Math.max(3, (v / peakIssue) * 100)}%` }} />
                </span>
                <span className="w-8 text-right text-[11px] font-medium text-ink-700">{v}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-line">
        <table className="min-w-full">
          <thead className="border-b border-line">
            <tr><Th>Job</Th><Th>Customer</Th><Th>Device</Th><Th>Issue</Th><Th>Centre</Th><Th>TAT</Th><Th>Quote</Th><Th>Stage</Th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.slice(0, 150).map((j) => (
              <tr key={j.id} onClick={() => setOpenId(j.id)}
                className={`cursor-pointer transition-colors hover:bg-surface ${openId === j.id ? "bg-brand-50/60" : ""}`}>
                <Td><span className="font-mono text-xs text-brand-700">{j.code}</span></Td>
                <Td>{j.customer.name}<span className="ml-1 text-xs text-ink-400">{j.customer.phone}</span></Td>
                <Td>{j.brand} {j.model}</Td>
                <Td><span className="max-w-40 truncate text-xs">{j.issue}</span></Td>
                <Td><span className="text-xs">{nodeName(j.nodeId)}</span><span className="ml-1 text-xs text-ink-400">{j.mode}</span></Td>
                <Td><span className={tatTone(j)}>{j.tatDays}d</span></Td>
                <Td>{j.quoteAmount ? formatINR(j.quoteAmount) : "—"}</Td>
                <Td><StatusChip value={j.stage} /></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <RepairDrawer
        jobId={openId}
        nodes={nodes}
        onClose={() => setOpenId(null)}
        onChanged={(u) => setJobs((prev) => prev.map((j) => (j.id === u.id ? u : j)))}
      />
    </div>
  );
}
