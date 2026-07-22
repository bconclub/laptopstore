"use client";

/**
 * Repair drawer — right panel for one job: stage checklist, device & issue,
 * diagnosis/quote, service node, customer, timeline, and inline stage moves
 * (diagnosis + quote captured in the drawer, not prompt()).
 */

import { useCallback, useEffect, useState } from "react";
import { MapPin, Wrench, X } from "lucide-react";
import { StatusChip, api } from "@/components/admin/ui";
import { formatINR } from "@/lib/format";
import type { RepairJob, RepairStage, StoreNode } from "@/lib/types";

const FLOW: RepairStage[] = ["booked", "received", "diagnosed", "quoted", "approved", "in_repair", "ready", "delivered"];

const NEXT: Record<string, RepairStage[]> = {
  booked: ["received", "cancelled"],
  received: ["diagnosed"],
  diagnosed: ["quoted"],
  quoted: ["approved", "cancelled"],
  approved: ["in_repair"],
  in_repair: ["ready"],
  ready: ["delivered"],
};

export function RepairDrawer({
  jobId,
  nodes,
  onClose,
  onChanged,
}: {
  jobId: string | null;
  nodes: Map<string, StoreNode>;
  onClose: () => void;
  onChanged?: (j: RepairJob) => void;
}) {
  const [job, setJob] = useState<RepairJob | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [quote, setQuote] = useState("");

  const load = useCallback(async () => {
    if (!jobId) return;
    setJob(null);
    setError("");
    const r = await api<RepairJob>(`/api/admin/repairs/${jobId}`);
    if (r.ok) setJob(r.data!);
    else setError(r.error ?? "Could not load job");
  }, [jobId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!jobId) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [jobId, onClose]);

  async function move(to: RepairStage) {
    if (!jobId) return;
    const patch: Record<string, unknown> = { to };
    if (to === "diagnosed") patch.diagnosis = diagnosis || "Diagnosed at service desk";
    if (to === "quoted") patch.quoteAmount = Number(quote) || 0;
    setBusy(to);
    setError("");
    const r = await api<RepairJob>(`/api/admin/repairs/${jobId}/transition`, { method: "POST", body: JSON.stringify(patch) });
    if (r.ok) { setJob(r.data!); onChanged?.(r.data!); setDiagnosis(""); setQuote(""); }
    else setError(r.error ?? "Transition failed");
    setBusy("");
  }

  const open = !!jobId;
  const node = job ? nodes.get(job.nodeId) : undefined;
  const stageIdx = job ? FLOW.indexOf(job.stage) : -1;
  const ageDays = job ? (Date.now() - new Date(job.createdAt).getTime()) / 86400_000 : 0;
  const tatState = !job || ["delivered", "cancelled"].includes(job.stage) ? "done"
    : ageDays > job.tatDays ? "breached" : ageDays > job.tatDays * 0.7 ? "near" : "ok";
  const next = job ? (NEXT[job.stage] ?? []) : [];

  return (
    <>
      <div onClick={onClose} className={`fixed inset-0 z-40 bg-ink-900/25 transition-opacity duration-200 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} aria-hidden="true" />
      <aside
        role="dialog"
        aria-label="Repair details"
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-(--shadow-float) transition-transform duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {job ? (
          <>
            <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
              <Wrench className="h-4 w-4 text-brand-600" />
              <span className="font-mono text-base font-bold text-brand-700">{job.code}</span>
              <StatusChip value={job.stage} />
              <span className="flex-1" />
              <button onClick={onClose} aria-label="Close panel" className="rounded-md p-1.5 text-ink-300 transition-colors hover:bg-surface hover:text-ink-700">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

              {/* Device + issue */}
              <div className="rounded-xl bg-surface p-3">
                <p className="text-sm font-bold text-ink-900">{job.brand} {job.model}</p>
                <p className="mt-0.5 text-sm text-ink-600">{job.issue}</p>
                <p className="mt-1.5 text-xs text-ink-500">
                  {job.serviceType} · {job.mode} · slot {job.slot.date} {job.slot.window}
                </p>
                <p className={`mt-1 text-xs font-semibold ${tatState === "breached" ? "text-danger" : tatState === "near" ? "text-warn" : tatState === "ok" ? "text-success" : "text-ink-400"}`}>
                  TAT {job.tatDays}d · {tatState === "done" ? "closed" : `${ageDays.toFixed(1)}d elapsed${tatState === "breached" ? " — BREACHED" : tatState === "near" ? " — running close" : ""}`}
                </p>
              </div>

              {/* Stage checklist */}
              {job.stage === "cancelled" ? (
                <p className="rounded-xl bg-danger/10 px-3 py-2.5 text-sm font-semibold text-danger">Job cancelled</p>
              ) : (
                <ol className="space-y-1">
                  {FLOW.map((s, i) => (
                    <li key={s} className="flex items-center gap-2.5 text-sm">
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                        i < stageIdx ? "bg-brand-600 text-white" : i === stageIdx ? "bg-brand-600 text-white ring-4 ring-brand-100" : "bg-surface text-ink-400 ring-1 ring-line"
                      }`}>
                        {i < stageIdx ? "✓" : i + 1}
                      </span>
                      <span className={i === stageIdx ? "font-bold text-brand-700" : i < stageIdx ? "text-ink-700" : "text-ink-400"}>
                        {s.replace(/_/g, " ")}
                      </span>
                    </li>
                  ))}
                </ol>
              )}

              {/* Diagnosis + quote so far */}
              {(job.diagnosis || job.quoteAmount) && (
                <div className="rounded-xl bg-brand-50 p-3 text-sm">
                  {job.diagnosis && <p className="text-ink-700"><span className="font-semibold">Diagnosis:</span> {job.diagnosis}</p>}
                  {!!job.quoteAmount && <p className="mt-1 text-ink-700"><span className="font-semibold">Quote:</span> {formatINR(job.quoteAmount)} {job.advancePaid && <span className="text-xs text-success">· advance paid</span>}</p>}
                </div>
              )}

              {/* Where */}
              <section>
                <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink-400">Service centre</h3>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-3.5 w-3.5 text-brand-600" />
                  <span className="font-semibold text-ink-900">{node?.name ?? job.nodeId}</span>
                </div>
                {node && <p className="pl-5.5 text-xs text-ink-500">{node.area}, {node.city} · {node.phone}</p>}
              </section>

              {/* Customer */}
              <section>
                <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink-400">Customer</h3>
                <p className="text-sm font-medium text-ink-900">{job.customer.name}</p>
                <p className="text-xs text-ink-500">{job.customer.phone} · pincode {job.customer.pincode}</p>
              </section>

              {/* Timeline */}
              <section>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">What's happened</h3>
                <ol className="space-y-1.5 border-l-2 border-brand-100 pl-3">
                  {[...job.timeline].reverse().map((e, i) => (
                    <li key={i} className="text-xs text-ink-500">
                      <span className="font-semibold text-ink-700">{e.to.replace(/_/g, " ")}</span>
                      {" · "}
                      {new Date(e.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      <span className="ml-1 text-ink-400">by {e.by}</span>
                      {e.note && <span className="block text-ink-400">{e.note}</span>}
                    </li>
                  ))}
                </ol>
              </section>
            </div>

            {/* Actions */}
            <div className="space-y-2.5 border-t border-line px-5 py-4">
              {next.includes("diagnosed") && (
                <input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="Diagnosis note (goes on the job)"
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm" />
              )}
              {next.includes("quoted") && (
                <input value={quote} onChange={(e) => setQuote(e.target.value)} placeholder="Quote amount ₹" inputMode="numeric"
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm" />
              )}
              {next.length ? (
                <div className="flex flex-wrap gap-2">
                  {next.map((to) => (
                    <button key={to} disabled={!!busy} onClick={() => move(to)}
                      className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-40 ${
                        to === "cancelled" ? "text-danger ring-1 ring-danger/30 hover:bg-danger/5" : "bg-brand-600 text-white hover:bg-brand-700"
                      }`}>
                      {busy === to ? "…" : `Move to ${to.replace(/_/g, " ")}`}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-ink-400">Job is closed — nothing left to do.</p>
              )}
            </div>
          </>
        ) : (
          <p className="p-6 text-sm text-ink-500">{error || "Loading job…"}</p>
        )}
      </aside>
    </>
  );
}
