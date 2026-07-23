"use client";

/**
 * Admin home — rich command dashboard: revenue chart with axes + range
 * selector, operations donut, KPI tiles with deltas + sparklines, revenue
 * by line with share %, top nodes, latest orders. CSV export of orders.
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, CalendarClock, Download, Headphones, Laptop, MapPin,
  MemoryStick, MessageSquareQuote, Package, RefreshCw, Timer, Truck, Wrench,
} from "lucide-react";
import { OrderDrawer } from "@/components/admin/OrderDrawer";
import { StatusChip, api } from "@/components/admin/ui";
import { formatINR } from "@/lib/format";
import type { Analytics } from "@/lib/provider/contract";
import type { Enquiry, Order, RepairJob, StoreNode } from "@/lib/types";

/* ── palette for data viz (brand-led categorical) ── */
const C = { blue: "#0081C5", violet: "#7C6FDE", green: "#0E8345", orange: "#E8830C", amber: "#E9C400" };

const inr = (v: number) => (v >= 1e7 ? `₹${(v / 1e7).toFixed(1)}Cr` : v >= 1e5 ? `₹${(v / 1e5).toFixed(1)}L` : `₹${(v / 1e3).toFixed(0)}K`);

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function Delta({ pct, invert = false }: { pct: number | null; invert?: boolean }) {
  if (pct === null) return null;
  const good = invert ? pct <= 0 : pct >= 0;
  return (
    <span className={`text-xs font-semibold ${good ? "text-success" : "text-danger"}`}>
      {pct >= 0 ? "↑" : "↓"} {Math.abs(pct)}%
    </span>
  );
}

/* ── Revenue area chart with axes + end chip ── */
function RevenueChart({ series }: { series: { date: string; revenue: number }[] }) {
  const W = 660, H = 190, PL = 44, PB = 22, PT = 14;
  const d = useMemo(() => {
    if (series.length < 2) return null;
    const max = Math.max(...series.map((p) => p.revenue), 1);
    const x = (i: number) => PL + (i / (series.length - 1)) * (W - PL - 8);
    const y = (v: number) => PT + (1 - v / max) * (H - PT - PB);
    const pts = series.map((p, i) => [x(i), y(p.revenue)] as const);
    const line = pts.map(([px, py], i) => `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
    const ticks = [0, 0.5, 1].map((f) => ({ v: max * f, y: y(max * f) }));
    const xs = [0, Math.floor(series.length / 3), Math.floor((2 * series.length) / 3), series.length - 1]
      .map((i) => ({ x: x(i), label: new Date(series[i].date).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) }));
    const last = pts[pts.length - 1];
    return { line, area: `${line} L${W - 8},${H - PB} L${PL},${H - PB} Z`, ticks, xs, last, lastVal: series[series.length - 1].revenue };
  }, [series]);
  if (!d) return null;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs>
        <linearGradient id="rev-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.blue} stopOpacity="0.16" />
          <stop offset="100%" stopColor={C.blue} stopOpacity="0" />
        </linearGradient>
      </defs>
      {d.ticks.map((t, i) => (
        <g key={i}>
          <line x1={PL} y1={t.y} x2={W - 8} y2={t.y} stroke="#E2E8F0" strokeDasharray="3 4" strokeWidth="1" />
          <text x={PL - 6} y={t.y + 3.5} textAnchor="end" fontSize="10" fill="#9BA5B1">{inr(t.v)}</text>
        </g>
      ))}
      {d.xs.map((t, i) => (
        <text key={i} x={t.x} y={H - 6} textAnchor="middle" fontSize="10" fill="#9BA5B1">{t.label}</text>
      ))}
      <path d={d.area} fill="url(#rev-g)" />
      <path d={d.line} fill="none" stroke={C.blue} strokeWidth="2" strokeLinejoin="round" />
      <circle cx={d.last[0]} cy={d.last[1]} r="4" fill={C.blue} stroke="#fff" strokeWidth="2" />
      <g transform={`translate(${Math.min(d.last[0] - 24, W - 62)}, ${Math.max(d.last[1] - 26, 4)})`}>
        <rect width="54" height="18" rx="4" fill={C.blue} />
        <text x="27" y="12.5" textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff">{inr(d.lastVal)}</text>
      </g>
    </svg>
  );
}

/* ── Donut ── */
function Donut({ segments, total }: { segments: { value: number; color: string }[]; total: number }) {
  const R = 52, CIRC = 2 * Math.PI * R;
  const sum = Math.max(1, segments.reduce((s, x) => s + x.value, 0));
  let acc = 0;
  return (
    <svg viewBox="0 0 140 140" className="h-40 w-40">
      {segments.map((s, i) => {
        const frac = s.value / sum;
        const el = (
          <circle key={i} cx="70" cy="70" r={R} fill="none" stroke={s.color} strokeWidth="14" strokeLinecap="round"
            strokeDasharray={`${Math.max(0.5, frac * CIRC - 4)} ${CIRC}`} strokeDashoffset={-acc * CIRC}
            transform="rotate(-90 70 70)" />
        );
        acc += frac;
        return el;
      })}
      <text x="70" y="66" textAnchor="middle" fontSize="24" fontWeight="800" fill="#181C1E">{total}</text>
      <text x="70" y="84" textAnchor="middle" fontSize="10" fill="#9BA5B1">Total</text>
    </svg>
  );
}

/* ── Small sparkline ── */
function Spark({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${28 - (v / max) * 24}`).join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-8 w-full">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

const LINE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  new: Laptop, spares: MemoryStick, accessories: Headphones,
  rental: CalendarClock, refurbished: RefreshCw, repair: Wrench,
};

export default function AdminDashboard() {
  const [a, setA] = useState<Analytics | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [repairs, setRepairs] = useState<RepairJob[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [nodes, setNodes] = useState<Map<string, StoreNode>>(new Map());
  const [openId, setOpenId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [range, setRange] = useState(30);
  const [error, setError] = useState("");

  useEffect(() => {
    void api<Analytics>("/api/admin/analytics").then((r) => (r.ok ? setA(r.data!) : setError(r.error ?? "failed")));
    void api<Order[]>("/api/admin/orders?limit=1000").then((r) => setOrders(r.data ?? []));
    void api<RepairJob[]>("/api/admin/repairs?limit=500").then((r) => setRepairs(r.data ?? []));
    void api<Enquiry[]>("/api/admin/enquiries?limit=200").then((r) => setEnquiries(r.data ?? []));
    void api<StoreNode[]>("/api/admin/nodes").then((r) => setNodes(new Map((r.data ?? []).map((n) => [n.id, n]))));
    void api<{ name?: string } | null>("/api/auth/me").then((r) => setName(r.data?.name?.split(" ")[0] ?? ""));
  }, []);

  const stats = useMemo(() => {
    if (!a) return null;
    const cutoff = (d: number) => Date.now() - d * 86400_000;
    const inWin = (iso: string) => new Date(iso).getTime() >= cutoff(range);
    const inPrev = (iso: string) => { const t = new Date(iso).getTime(); return t >= cutoff(range * 2) && t < cutoff(range); };
    const pct = (cur: number, prev: number): number | null => (prev ? Math.round(((cur - prev) / prev) * 100) : null);

    const series = a.revenueByDay.slice(-range);
    const revCur = series.reduce((s, p) => s + p.revenue, 0);
    const revPrev = a.revenueByDay.slice(-range * 2, -range).reduce((s, p) => s + p.revenue, 0);

    const oCur = orders.filter((o) => inWin(o.createdAt));
    const oPrev = orders.filter((o) => inPrev(o.createdAt));
    const aov = oCur.length ? Math.round(oCur.reduce((s, o) => s + o.totals.grand, 0) / oCur.length) : 0;
    const aovPrev = oPrev.length ? Math.round(oPrev.reduce((s, o) => s + o.totals.grand, 0) / oPrev.length) : 0;

    const done = repairs.filter((j) => j.stage === "delivered" && inWin(j.createdAt));
    const onTime = done.filter((j) => {
      const end = j.timeline.find((e) => e.to === "delivered");
      return end && (new Date(end.at).getTime() - new Date(j.createdAt).getTime()) / 86400_000 <= j.tatDays + 0.5;
    });
    const onTimePct = done.length ? Math.round((onTime.length / done.length) * 100) : 0;

    // per-day sparks over the window
    const days = [...Array(Math.min(range, 30))].map((_, i) => {
      const day = new Date(cutoff(Math.min(range, 30) - 1 - i)).toISOString().slice(0, 10);
      return {
        orders: orders.filter((o) => o.createdAt.slice(0, 10) === day).length,
        rev: a.revenueByDay.find((p) => p.date === day)?.revenue ?? 0,
        repairs: repairs.filter((j) => j.createdAt.slice(0, 10) === day).length,
      };
    });

    const eCur = enquiries.filter((e) => inWin(e.createdAt)).length;
    const ePrev = enquiries.filter((e) => inPrev(e.createdAt)).length;
    const rCur = repairs.filter((j) => inWin(j.createdAt)).length;
    const rPrev = repairs.filter((j) => inPrev(j.createdAt)).length;

    return {
      series, revCur, revDelta: pct(revCur, revPrev),
      orderCount: oCur.length, orderDelta: pct(oCur.length, oPrev.length),
      aov, aovDelta: pct(aov, aovPrev),
      onTimePct, days,
      enqDelta: pct(eCur, ePrev), repDelta: pct(rCur, rPrev),
    };
  }, [a, orders, repairs, enquiries, range]);

  function exportCsv() {
    const rows = [["Order", "Customer", "Phone", "Amount", "Status", "Date"],
      ...orders.map((o) => [o.code, o.customer.name, o.customer.phone, String(o.totals.grand), o.status, o.createdAt.slice(0, 10)])];
    const blob = new Blob([rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url; el.download = `laptopstore-orders-${new Date().toISOString().slice(0, 10)}.csv`; el.click();
    URL.revokeObjectURL(url);
  }

  if (error) return <p className="rounded-lg bg-danger/10 p-4 text-sm text-danger">{error}</p>;
  if (!a || !stats) return <p className="p-4 text-sm text-ink-500">Loading…</p>;

  const lineTotal = Math.max(1, a.revenueByLine.reduce((s, r) => s + r.revenue, 0));
  const donutSegs = [
    { label: "Enquiries", value: a.totals.enquiries, color: C.violet, sub: `${a.conversion.enquiryToOrderPct}% convert to orders`, delta: stats.enqDelta, href: "/admin/enquiries", icon: MessageSquareQuote },
    { label: "Repairs", value: a.totals.repairs, color: C.green, sub: `${a.repairTat.avgDays}d avg turnaround · ${a.repairTat.withinTatPct}% on time`, delta: stats.repDelta, href: "/admin/repairs", icon: Wrench },
    { label: "Rental fleet", value: a.rentalUtilisation.unitsBooked, color: C.blue, sub: `${a.rentalUtilisation.utilisationPct}% of ${a.rentalUtilisation.unitsInFleet} units out`, delta: null, href: "/admin/rentals", icon: CalendarClock },
    { label: "Refurb sold", value: a.refurbSellThrough.unitsSold, color: C.orange, sub: `${a.refurbSellThrough.sellThroughPct}% of ${a.refurbSellThrough.unitsTotal} serials`, delta: null, href: "/admin/catalog", icon: RefreshCw },
  ];
  const donutTotal = donutSegs.reduce((s, x) => s + x.value, 0);

  const kpis = [
    { label: "Total Orders", value: String(stats.orderCount), delta: stats.orderDelta, icon: Package, color: C.violet, spark: stats.days.map((d) => d.orders) },
    { label: "Avg Order Value", value: formatINR(stats.aov), delta: stats.aovDelta, icon: Truck, color: C.blue, spark: stats.days.map((d) => d.rev) },
    { label: "On-time Repairs", value: `${stats.onTimePct}%`, delta: null, icon: Timer, color: C.green, spark: stats.days.map((d) => d.repairs) },
    { label: "Units in Fleet", value: `${a.rentalUtilisation.unitsInFleet - a.rentalUtilisation.unitsBooked} / ${a.rentalUtilisation.unitsInFleet}`, delta: null, icon: CalendarClock, color: C.orange, spark: stats.days.map((d) => d.orders + d.repairs) },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">{greeting()}{name ? `, ${name}` : ""}</h1>
          <p className="mt-0.5 text-sm text-ink-400">Here's how the network is trading today.</p>
        </div>
        <select value={range} onChange={(e) => setRange(Number(e.target.value))}
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink-700">
          <option value={30}>Last 30 days</option>
          <option value={60}>Last 60 days</option>
          <option value={90}>Last 90 days</option>
        </select>
        <button onClick={exportCsv} className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-surface">
          <Download className="h-3.5 w-3.5" /> Export
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Revenue */}
        <section className="rounded-2xl bg-white p-5 shadow-(--shadow-card) lg:col-span-3">
          <div className="flex items-baseline gap-3">
            <p className="text-sm font-semibold text-ink-900">Revenue</p>
            <Delta pct={stats.revDelta} />
            <span className="text-xs text-ink-400">vs previous {range} days</span>
          </div>
          <p className="mt-1 text-3xl font-bold tracking-tight text-ink-900">{formatINR(stats.revCur)}</p>
          <div className="mt-3"><RevenueChart series={stats.series} /></div>
        </section>

        {/* Operations donut */}
        <section className="rounded-2xl bg-white p-5 shadow-(--shadow-card) lg:col-span-2">
          <p className="text-sm font-semibold text-ink-900">Operations overview</p>
          <div className="mt-2 flex items-center gap-4">
            <Donut segments={donutSegs} total={donutTotal} />
            <div className="min-w-0 flex-1 space-y-1">
              {donutSegs.map((s) => {
                const Icon = s.icon;
                return (
                  <Link key={s.label} href={s.href} className="group flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-surface">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: `${s.color}1c` }}>
                      <Icon className="h-3 w-3" style={{ color: s.color }} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-ink-800">{s.label}</span>
                      <span className="block truncate text-[10px] text-ink-400">{s.sub}</span>
                    </span>
                    <span className="text-sm font-bold text-ink-900">{s.value}</span>
                    <Delta pct={s.delta} />
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="rounded-2xl bg-white p-4 shadow-(--shadow-card)">
              <div className="flex items-start justify-between">
                <p className="text-xs font-semibold text-ink-500">{k.label}</p>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${k.color}1a` }}>
                  <Icon className="h-4 w-4" style={{ color: k.color }} />
                </span>
              </div>
              <p className="text-xl font-bold text-ink-900">{k.value} <Delta pct={k.delta} /></p>
              <div className="mt-2"><Spark values={k.spark} color={k.color} /></div>
            </div>
          );
        })}
      </div>

      {/* Revenue by line + top nodes */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-5 shadow-(--shadow-card)">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-ink-900">Revenue by line</p>
            <Link href="/admin/analytics" className="text-xs font-medium text-brand-700 hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {a.revenueByLine.map((r) => {
              const Icon = LINE_ICON[r.line] ?? Laptop;
              const share = Math.round((r.revenue / lineTotal) * 100);
              return (
                <div key={r.line} className="flex items-center gap-2.5">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-ink-300" />
                  <span className="w-24 truncate text-xs capitalize text-ink-600">{r.line}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(2, share)}%`, background: C.blue }} />
                  </div>
                  <span className="w-20 text-right text-xs font-semibold text-ink-800">{formatINR(r.revenue)}</span>
                  <span className="w-9 text-right text-[11px] text-ink-400">{share}%</span>
                </div>
              );
            })}
          </div>
        </section>
        <section className="rounded-2xl bg-white p-5 shadow-(--shadow-card)">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-ink-900">Top nodes</p>
            <Link href="/admin/network" className="text-xs font-medium text-brand-700 hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {a.revenueByNode.slice(0, 6).map((r) => {
              const peak = a.revenueByNode[0]?.revenue ?? 1;
              return (
                <div key={r.nodeId} className="flex items-center gap-2.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-ink-300" />
                  <span className="w-32 truncate text-xs text-ink-600">{r.nodeName.replace(/^(Laptop Store|Dell Exclusive Store|Lenovo Exclusive Store) - /, "")}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(2, (r.revenue / peak) * 100)}%`, background: C.blue }} />
                  </div>
                  <span className="w-20 text-right text-xs font-semibold text-ink-800">{formatINR(r.revenue)}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Latest orders */}
      <section className="rounded-2xl bg-white shadow-(--shadow-card)">
        <div className="flex items-center justify-between px-5 py-4">
          <p className="text-sm font-semibold text-ink-900">Latest orders</p>
          <Link href="/admin/orders" className="flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
            View all orders <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-line border-t border-line">
          {orders.slice(0, 6).map((o) => (
            <button key={o.id} onClick={() => setOpenId(o.id)}
              className="grid w-full grid-cols-[1fr_1fr_auto_auto_auto] items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-surface">
              <span className="font-mono text-sm text-brand-700">{o.code}</span>
              <span className="truncate text-sm text-ink-600">{o.customer.name}</span>
              <span className="text-sm font-semibold text-ink-900">{formatINR(o.totals.grand)}</span>
              <StatusChip value={o.status} />
              <span className="hidden text-xs text-ink-400 sm:block">
                {new Date(o.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </button>
          ))}
        </div>
      </section>

      <OrderDrawer orderId={openId} nodes={nodes} onClose={() => setOpenId(null)}
        onChanged={(u) => setOrders((prev) => prev.map((o) => (o.id === u.id ? u : o)))} />
    </div>
  );
}
