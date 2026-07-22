"use client";

/** Zoho sync health — synced/failed/stale/pending, last run, error, retry. */

import { useCallback, useEffect, useState } from "react";
import { KpiTile, StatusChip, Th, Td, api } from "@/components/admin/ui";
import type { SyncRecord } from "@/lib/types";

export default function AdminSync() {
  const [records, setRecords] = useState<SyncRecord[]>([]);
  const [filter, setFilter] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const q = filter ? `?status=${filter}` : "";
    const r = await api<SyncRecord[]>(`/api/admin/sync${q}`);
    setRecords(r.data ?? []);
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function retry(id: string) {
    const r = await api<SyncRecord>("/api/admin/sync", { method: "POST", body: JSON.stringify({ id }) });
    setMsg(r.ok ? `${id} re-synced` : r.error ?? "retry failed");
    void load();
  }

  const count = (s: string) => records.filter((r) => r.status === s).length;
  const attention = records.filter((r) => r.status === "failed" || r.status === "stale");
  const shown = filter ? records : [...attention, ...records.filter((r) => r.status === "pending")].slice(0, 60);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-ink-900">Zoho sync health</h1>
        <p className="text-xs text-ink-400">Mock states now — the sync engine (separate workstream) drives these for real. Zoho always wins conflicts.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <button onClick={() => setFilter("")}><KpiTile label="Synced" value={count("synced")} sub="in lockstep with Zoho" /></button>
        <button onClick={() => setFilter("failed")}><KpiTile label="Failed" value={count("failed")} sub="needs retry" /></button>
        <button onClick={() => setFilter("stale")}><KpiTile label="Stale" value={count("stale")} sub="not refreshed recently / overridden" /></button>
        <button onClick={() => setFilter("pending")}><KpiTile label="Pending" value={count("pending")} sub="new — awaiting first sync" /></button>
      </div>
      {msg && <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">{msg}</p>}
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-line">
        <table className="min-w-full">
          <thead className="border-b border-line">
            <tr><Th>Record</Th><Th>Entity</Th><Th>Zoho id</Th><Th>Status</Th><Th>Last run</Th><Th>Error</Th><Th>Action</Th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {shown.map((r) => (
              <tr key={r.id} className="hover:bg-surface">
                <Td><span className="font-mono text-xs">{r.id}</span></Td>
                <Td>{r.entityType} <span className="text-xs text-ink-400">{r.entityId}</span></Td>
                <Td><span className="font-mono text-xs">{r.zohoRecordId ?? "—"}</span></Td>
                <Td><StatusChip value={r.status} /></Td>
                <Td><span className="text-xs">{new Date(r.lastRunAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></Td>
                <Td><span className="max-w-60 truncate text-xs text-danger">{r.error ?? ""}</span></Td>
                <Td>
                  {(r.status === "failed" || r.status === "stale") && (
                    <button onClick={() => retry(r.id)} className="rounded bg-brand-600 px-2.5 py-1 text-[11px] font-semibold text-white">Retry</button>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filter && (
          <p className="border-t border-line px-3 py-2 text-xs text-ink-400">
            Showing records needing attention first ({attention.length}); pick a tile to filter the full {records.length}.
          </p>
        )}
      </div>
    </div>
  );
}
