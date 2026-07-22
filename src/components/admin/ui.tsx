"use client";

/** Shared admin primitives — light "Retail Precision", table-first. */

import type { ReactNode } from "react";

const TONE: Record<string, string> = {
  // success-ish
  completed: "bg-success/10 text-success",
  delivered: "bg-success/10 text-success",
  closed: "bg-success/10 text-success",
  synced: "bg-success/10 text-success",
  active: "bg-success/10 text-success",
  order_confirmed: "bg-success/10 text-success",
  // danger-ish
  cancelled: "bg-danger/10 text-danger",
  lost: "bg-danger/10 text-danger",
  failed: "bg-danger/10 text-danger",
  // warn-ish
  stale: "bg-accent-400/20 text-warn",
  return_due: "bg-accent-400/20 text-warn",
  pending: "bg-accent-400/20 text-warn",
};

export function StatusChip({ value }: { value: string }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE[value] ?? "bg-brand-50 text-brand-700"}`}>
      {value.replace(/_/g, " ")}
    </span>
  );
}

export function LineChip({ line }: { line: string }) {
  const tone: Record<string, string> = {
    new: "bg-brand-600 text-white",
    refurbished: "bg-brand-100 text-brand-800",
    rental: "bg-accent-400 text-ink-900",
    spares: "bg-surface text-ink-700 ring-1 ring-line",
    accessories: "bg-ink-300/20 text-ink-700",
  };
  return <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${tone[line] ?? "bg-surface"}`}>{line}</span>;
}

export function ZohoLock({ synced }: { synced?: boolean }) {
  return (
    <span
      title={synced === false ? "Not yet synced with Zoho" : "Synced from Zoho — read-only here, Zoho always wins"}
      className="ml-1 align-middle text-[10px] font-bold uppercase tracking-wide text-brand-500"
    >
      ⇄ zoho
    </span>
  );
}

export function KpiTile({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-line">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-500">{sub}</p>}
    </div>
  );
}

export function MiniBars({ data, max }: { data: { label: string; value: number }[]; max?: number }) {
  const peak = max ?? Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2">
          <span className="w-36 truncate text-xs text-ink-600">{d.label}</span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.max(2, (d.value / peak) * 100)}%` }} />
          </div>
          <span className="w-20 text-right text-xs font-medium text-ink-700">{d.value.toLocaleString("en-IN")}</span>
        </div>
      ))}
    </div>
  );
}

export function Th({ children }: { children: ReactNode }) {
  return <th className="whitespace-nowrap px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-400">{children}</th>;
}

export function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`whitespace-nowrap px-3 py-2 text-sm text-ink-700 ${className}`}>{children}</td>;
}

export async function api<T = unknown>(path: string, init?: RequestInit): Promise<{ ok: boolean; data?: T; error?: string; allowed?: string[]; status: number }> {
  const res = await fetch(path, {
    ...init,
    headers: init?.body ? { "content-type": "application/json", ...init?.headers } : init?.headers,
  });
  const body = await res.json().catch(() => ({}));
  return { ...body, status: res.status };
}
