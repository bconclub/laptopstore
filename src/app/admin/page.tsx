"use client";

/**
 * Admin home — Mercury-style: greeting, hero revenue card with a 90-day
 * sparkline, operations summary column, revenue splits, recent orders.
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { OrderDrawer } from "@/components/admin/OrderDrawer";
import { MiniBars, StatusChip, api } from "@/components/admin/ui";
import { formatINR } from "@/lib/format";
import type { Analytics } from "@/lib/provider/contract";
import type { Order, StoreNode } from "@/lib/types";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** Dependency-free area sparkline over daily revenue. */
function RevenueSpark({ series }: { series: { date: string; revenue: number }[] }) {
  const d = useMemo(() => {
    if (series.length < 2) return { line: "", area: "" };
    const w = 640;
    const h = 120;
    const max = Math.max(...series.map((p) => p.revenue), 1);
    const pts = series.map((p, i) => [
      (i / (series.length - 1)) * w,
      h - 8 - (p.revenue / max) * (h - 24),
    ]);
    const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
    return { line, area: `${line} L${w},${h} L0,${h} Z` };
  }, [series]);

  return (
    <svg viewBox="0 0 640 120" className="h-28 w-full" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0081C5" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#0081C5" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={d.area} fill="url(#rev-fill)" />
      <path d={d.line} fill="none" stroke="#0081C5" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export default function AdminDashboard() {
  const [a, setA] = useState<Analytics | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [nodes, setNodes] = useState<Map<string, StoreNode>>(new Map());
  const [openId, setOpenId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void api<Analytics>("/api/admin/analytics").then((r) => (r.ok ? setA(r.data!) : setError(r.error ?? "failed")));
    void api<Order[]>("/api/admin/orders?limit=6").then((r) => setOrders(r.data ?? []));
    void api<StoreNode[]>("/api/admin/nodes").then((r) => setNodes(new Map((r.data ?? []).map((n) => [n.id, n]))));
    void api<{ name?: string } | null>("/api/auth/me").then((r) => setName(r.data?.name?.split(" ")[0] ?? ""));
  }, []);

  if (error) return <p className="rounded-lg bg-danger/10 p-4 text-sm text-danger">{error}</p>;
  if (!a) return <p className="p-4 text-sm text-ink-500">Loading…</p>;

  const last30 = a.revenueByDay.slice(-30).reduce((s, p) => s + p.revenue, 0);
  const prev30 = a.revenueByDay.slice(-60, -30).reduce((s, p) => s + p.revenue, 0);
  const deltaPct = prev30 ? Math.round(((last30 - prev30) / prev30) * 100) : 0;

  const ops: { label: string; value: string; sub: string; href: string; alert?: boolean }[] = [
    { label: "Enquiries", value: String(a.totals.enquiries), sub: `${a.conversion.enquiryToOrderPct}% convert to orders`, href: "/admin/enquiries" },
    { label: "Repairs", value: String(a.totals.repairs), sub: `${a.repairTat.avgDays}d avg turnaround · ${a.repairTat.withinTatPct}% on time`, href: "/admin/repairs" },
    { label: "Rental fleet", value: `${a.rentalUtilisation.utilisationPct}%`, sub: `${a.rentalUtilisation.unitsBooked} of ${a.rentalUtilisation.unitsInFleet} units out`, href: "/admin/rentals" },
    { label: "Refurb sell-through", value: `${a.refurbSellThrough.sellThroughPct}%`, sub: `${a.refurbSellThrough.unitsSold} of ${a.refurbSellThrough.unitsTotal} serials sold`, href: "/admin/catalog" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">
          {greeting()}{name ? `, ${name}` : ""}
        </h1>
        <p className="mt-0.5 text-sm text-ink-400">Here's how the network is trading.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Hero revenue card */}
        <section className="rounded-2xl bg-white p-6 shadow-(--shadow-card) lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-ink-400">Revenue · last 90 days</p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-ink-900">{formatINR(a.totals.revenue)}</p>
              <p className="mt-1 text-sm">
                <span className={deltaPct >= 0 ? "font-semibold text-success" : "font-semibold text-danger"}>
                  {deltaPct >= 0 ? "↑" : "↓"} {Math.abs(deltaPct)}%
                </span>
                <span className="text-ink-400"> vs previous 30 days · {a.totals.orders} orders</span>
              </p>
            </div>
            <Link href="/admin/analytics" className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50">
              Analytics <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-4">
            <RevenueSpark series={a.revenueByDay} />
          </div>
        </section>

        {/* Operations column (Mercury accounts-style) */}
        <section className="rounded-2xl bg-white p-2 shadow-(--shadow-card)">
          <p className="px-4 pb-1 pt-4 text-sm font-semibold text-ink-900">Operations</p>
          {ops.map((o) => (
            <Link key={o.label} href={o.href} className="group flex items-center justify-between rounded-xl px-4 py-3 transition-colors hover:bg-surface">
              <span>
                <span className="block text-sm font-medium text-ink-700">{o.label}</span>
                <span className="block text-xs text-ink-400">{o.sub}</span>
              </span>
              <span className="text-base font-bold text-ink-900">{o.value}</span>
            </Link>
          ))}
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-5 shadow-(--shadow-card)">
          <p className="mb-4 text-sm font-semibold text-ink-900">Revenue by line</p>
          <MiniBars data={a.revenueByLine.map((r) => ({ label: r.line, value: r.revenue }))} />
        </section>
        <section className="rounded-2xl bg-white p-5 shadow-(--shadow-card)">
          <p className="mb-4 text-sm font-semibold text-ink-900">Top nodes</p>
          <MiniBars data={a.revenueByNode.slice(0, 6).map((r) => ({ label: r.nodeName.replace("Laptop Store - ", ""), value: r.revenue }))} />
        </section>
      </div>

      {/* Recent orders */}
      <section className="rounded-2xl bg-white shadow-(--shadow-card)">
        <div className="flex items-center justify-between px-5 py-4">
          <p className="text-sm font-semibold text-ink-900">Latest orders</p>
          <Link href="/admin/orders" className="flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
            All orders <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-line border-t border-line">
          {orders.map((o) => (
            <button
              key={o.id}
              onClick={() => setOpenId(o.id)}
              className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-surface"
            >
              <span className="font-mono text-sm text-brand-700">{o.code}</span>
              <span className="hidden text-sm text-ink-600 sm:block">{o.customer.name}</span>
              <span className="text-sm font-semibold text-ink-900">{formatINR(o.totals.grand)}</span>
              <StatusChip value={o.status} />
            </button>
          ))}
        </div>
      </section>

      <OrderDrawer
        orderId={openId}
        nodes={nodes}
        onClose={() => setOpenId(null)}
        onChanged={(u) => setOrders((prev) => prev.map((o) => (o.id === u.id ? u : o)))}
      />
    </div>
  );
}
