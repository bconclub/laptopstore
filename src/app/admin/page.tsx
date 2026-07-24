"use client";

/**
 * Admin home — rich command dashboard: revenue chart with axes + range
 * selector, operations donut, KPI tiles with deltas + sparklines, revenue
 * by line with share %, top nodes, latest orders. CSV export of orders.
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, ArrowRight, CalendarClock, Download, Headphones, ImageOff, Laptop, MapPin,
  MemoryStick, Network, PackageCheck, PackageX, RefreshCw, Wrench,
} from "lucide-react";
import { OrderDrawer } from "@/components/admin/OrderDrawer";
import { NetworkActivityMap } from "./NetworkActivityMap";
import { DashboardSkeleton, StatusChip, api } from "@/components/admin/ui";
import { formatINR } from "@/lib/format";
import { useCatalogImages } from "@/lib/useCatalogImages";
import type { Analytics } from "@/lib/provider/contract";
import type { Enquiry, Order, ProductV2, RepairJob, StoreNode } from "@/lib/types";

/* ── palette for data viz (brand-led categorical) ── */
const C = { blue: "#0081C5", violet: "#7C6FDE", green: "#0E8345", orange: "#E8830C", amber: "#E9C400" };
/* Rank ramp: deepest brand-blue for the leader, fading down — gives ranked bars a visible hierarchy. */
const RANK = ["#005A8C", "#0081C5", "#2E9BD4", "#5FB4E0", "#93CDEC", "#BFE0F5", "#D8ECF9"];
const rankColor = (i: number) => RANK[Math.min(i, RANK.length - 1)];

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

/* Catmull-Rom → cubic-bezier smoothing so spiky daily revenue reads as a clean trend. */
function smoothPath(pts: readonly (readonly [number, number])[]): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

/* ── Revenue area chart — fills its card end-to-end; axis labels are crisp HTML. ── */
function RevenueChart({ series }: { series: { date: string; revenue: number }[] }) {
  const d = useMemo(() => {
    if (series.length < 2) return null;
    // Adaptive trailing moving average — smooths ₹0 valleys + B2B spikes.
    const mw = Math.min(7, Math.max(2, Math.floor(series.length / 4)));
    const ma = series.map((_, i) => {
      const win = series.slice(Math.max(0, i - (mw - 1)), i + 1);
      return win.reduce((s, p) => s + p.revenue, 0) / win.length;
    });
    const max = Math.max(...ma, 1);
    // Normalised 0..100 box; 4% top / 4% bottom breathing room. SVG stretches
    // to fill (preserveAspectRatio none), strokes stay crisp (vectorEffect).
    const x = (i: number) => (i / (series.length - 1)) * 100;
    const y = (v: number) => 4 + (1 - v / max) * 92;
    const pts = ma.map((v, i) => [x(i), y(v)] as const);
    const line = smoothPath(pts);
    const yTicks = [1, 0.5, 0].map((f) => ({ topPct: y(max * f), label: inr(max * f) }));
    const xTicks = [0, Math.floor(series.length / 3), Math.floor((2 * series.length) / 3), series.length - 1]
      .map((i) => ({ leftPct: x(i), label: new Date(series[i].date).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) }));
    return { line, area: `${line} L100,100 L0,100 Z`, yTicks, xTicks, last: pts[pts.length - 1] };
  }, [series]);
  if (!d) return null;
  return (
    <div className="relative h-full w-full pl-11 pb-5">
      {/* Y labels */}
      {d.yTicks.map((t, i) => (
        <span key={i} className="pointer-events-none absolute left-0 -translate-y-1/2 text-[10px] text-ink-400"
          style={{ top: `calc(${t.topPct}% * (100% - 20px) / 100)` }}>{t.label}</span>
      ))}
      <div className="relative h-full w-full" style={{ paddingBottom: 0 }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
          <defs>
            <linearGradient id="rev-g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.blue} stopOpacity="0.18" />
              <stop offset="100%" stopColor={C.blue} stopOpacity="0" />
            </linearGradient>
          </defs>
          {d.yTicks.map((t, i) => (
            <line key={i} x1="0" y1={t.topPct} x2="100" y2={t.topPct} stroke="#E2E8F0" strokeDasharray="1 1.5" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
          ))}
          <path d={d.area} fill="url(#rev-g)" />
          <path d={d.line} fill="none" stroke={C.blue} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
        {/* end dot (HTML so it stays round) */}
        <span className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brand-500"
          style={{ left: `${d.last[0]}%`, top: `${d.last[1]}%` }} />
      </div>
      {/* X labels */}
      <div className="absolute inset-x-0 bottom-0 ml-11 h-4">
        {d.xTicks.map((t, i) => (
          <span key={i} className="absolute -translate-x-1/2 text-[10px] text-ink-400" style={{ left: `${t.leftPct}%` }}>{t.label}</span>
        ))}
      </div>
    </div>
  );
}

const LINE_ICON: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  new: Laptop, spares: MemoryStick, accessories: RefreshCw,
  rental: CalendarClock, refurbished: RefreshCw, repair: Wrench,
};

/* Micro sparkline for the KPI tiles — smoothed area trend over the window. */
function MicroSpark({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * 100, 26 - (v / max) * 22] as const);
  let line = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    line += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  const id = `sp-${color.replace("#", "")}`;
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="h-7 w-full">
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.2" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={`${line} L100,28 L0,28 Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* Product thumbnail with graceful fallback — image-first everywhere. */
function Thumb({ src, size = "h-9 w-9" }: { src?: string; size?: string }) {
  const [fail, setFail] = useState(false);
  return (
    <span className={`flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface ring-1 ring-line`}>
      {src && !fail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-contain" loading="lazy" onError={() => setFail(true)} />
      ) : (
        <ImageOff className="h-4 w-4 text-ink-300" />
      )}
    </span>
  );
}

export default function AdminDashboard() {
  const [a, setA] = useState<Analytics | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [repairs, setRepairs] = useState<RepairJob[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [nodes, setNodes] = useState<Map<string, StoreNode>>(new Map());
  const [nodeList, setNodeList] = useState<StoreNode[]>([]);
  const [products, setProducts] = useState<(ProductV2 & { totalStock: number })[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [range, setRange] = useState(28);
  const [error, setError] = useState("");
  const imageOf = useCatalogImages();

  useEffect(() => {
    void api<Analytics>("/api/admin/analytics").then((r) => (r.ok ? setA(r.data!) : setError(r.error ?? "failed")));
    void api<Order[]>("/api/admin/orders?limit=1000").then((r) => setOrders(r.data ?? []));
    void api<RepairJob[]>("/api/admin/repairs?limit=500").then((r) => setRepairs(r.data ?? []));
    void api<Enquiry[]>("/api/admin/enquiries?limit=200").then((r) => setEnquiries(r.data ?? []));
    void api<StoreNode[]>("/api/admin/nodes").then((r) => { setNodes(new Map((r.data ?? []).map((n) => [n.id, n]))); setNodeList(r.data ?? []); });
    void api<(ProductV2 & { totalStock: number })[]>("/api/admin/products?limit=1000").then((r) => setProducts(r.data ?? []));
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

    const eCur = enquiries.filter((e) => inWin(e.createdAt)).length;
    const ePrev = enquiries.filter((e) => inPrev(e.createdAt)).length;
    const rCur = repairs.filter((j) => inWin(j.createdAt)).length;
    const rPrev = repairs.filter((j) => inPrev(j.createdAt)).length;

    // ── Operational health (what HQ actually watches) ──
    const nodesTotal = nodeList.length;
    const nodesLive = nodeList.filter((n) => n.status === "active").length;
    const nodesDown = nodesTotal - nodesLive;

    const openOrders = orders.filter((o) => ["confirmed", "processing", "ready"].includes(o.status));
    const openOrdersValue = openOrders.reduce((s, o) => s + o.totals.grand, 0);

    const openRepairs = repairs.filter((j) => !["delivered", "cancelled"].includes(j.stage));
    const overdueRepairs = openRepairs.filter((j) => (Date.now() - new Date(j.createdAt).getTime()) / 86400_000 > j.tatDays).length;

    // Products with nothing to sell anywhere — lost-sale risk.
    const sellable = products.filter((p) => p.line !== "rental");
    const outOfStock = sellable.filter((p) => p.totalStock === 0).length;

    // Per-day trend sparks over the window (orders placed, repairs booked).
    const spark = (rows: { createdAt: string }[]) =>
      [...Array(range)].map((_, k) => {
        const day = new Date(cutoff(range - 1 - k)).toISOString().slice(0, 10);
        return rows.filter((r) => r.createdAt.slice(0, 10) === day).length;
      });
    const ordersSpark = spark(orders);
    const repairsSpark = spark(repairs);

    return {
      series, revCur, revDelta: pct(revCur, revPrev),
      enqDelta: pct(eCur, ePrev), repDelta: pct(rCur, rPrev),
      nodesTotal, nodesLive, nodesDown,
      openOrders: openOrders.length, openOrdersValue,
      openRepairs: openRepairs.length, overdueRepairs,
      outOfStock, sellableCount: sellable.length,
      ordersSpark, repairsSpark,
    };
  }, [a, orders, repairs, enquiries, nodeList, products, range]);

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
  if (!a || !stats) return <DashboardSkeleton />;

  const lineTotal = Math.max(1, a.revenueByLine.reduce((s, r) => s + r.revenue, 0));

  // The four things HQ actually glances at: is the network up, is anything
  // stuck, are we keeping service promises, is the Zoho spine healthy.
  type Tone = "ok" | "warn" | "bad";
  const TONE: Record<Tone, { text: string; bg: string; bar: string }> = {
    ok: { text: "text-success", bg: "bg-success/10", bar: C.green },
    warn: { text: "text-warn", bg: "bg-accent-400/20", bar: C.amber },
    bad: { text: "text-danger", bg: "bg-danger/10", bar: "#BA1A1A" },
  };
  const tiles: {
    label: string; value: string; status: string; tone: Tone;
    icon: React.ComponentType<{ className?: string }>; href: string; ratio?: number; spark?: number[];
  }[] = [
    {
      label: "Network live", value: `${stats.nodesLive}/${stats.nodesTotal}`,
      status: stats.nodesDown ? `${stats.nodesDown} node${stats.nodesDown > 1 ? "s" : ""} down` : "all outlets operational · no downtime",
      tone: stats.nodesDown ? "bad" : "ok", icon: Network, href: "/admin/network", ratio: stats.nodesTotal ? stats.nodesLive / stats.nodesTotal : 1,
    },
    {
      label: "Orders to fulfil", value: String(stats.openOrders),
      status: `${formatINR(stats.openOrdersValue)} awaiting dispatch`,
      tone: stats.openOrders > 20 ? "warn" : "ok", icon: PackageCheck, href: "/admin/orders", spark: stats.ordersSpark,
    },
    {
      label: "Repairs overdue", value: String(stats.overdueRepairs),
      status: stats.overdueRepairs ? `of ${stats.openRepairs} in the shop · past the promised date` : `all ${stats.openRepairs} on time`,
      tone: stats.overdueRepairs ? "bad" : "ok", icon: AlertTriangle, href: "/admin/repairs", spark: stats.repairsSpark,
    },
    {
      label: "Out of stock", value: String(stats.outOfStock),
      status: stats.outOfStock ? "products we can't sell right now" : "everything is sellable",
      tone: stats.outOfStock > 15 ? "bad" : stats.outOfStock ? "warn" : "ok", icon: PackageX, href: "/admin/catalog",
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">{greeting()}{name ? `, ${name}` : ""}</h1>
          <p className="mt-0.5 text-sm text-ink-400">Here's how the network is trading today.</p>
        </div>
        <div className="flex items-center rounded-lg border border-line bg-white p-0.5">
          {[7, 14, 28, 90].map((d) => (
            <button key={d} onClick={() => setRange(d)}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${range === d ? "bg-brand-600 text-white" : "text-ink-500 hover:text-ink-900"}`}>
              {d === 90 ? "90d" : `${d}d`}
            </button>
          ))}
        </div>
        <button onClick={exportCsv} className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-surface">
          <Download className="h-3.5 w-3.5" /> Export
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Revenue */}
        <section className="rounded-2xl bg-white p-5 shadow-(--shadow-card) lg:col-span-3">
          <div className="flex items-baseline gap-3">
            <h2 className="text-sm font-semibold text-ink-900">Revenue</h2>
            <Delta pct={stats.revDelta} />
            <span className="text-xs text-ink-400">vs previous {range} days</span>
          </div>
          <p className="mt-1 text-3xl font-bold tracking-tight text-ink-900">{formatINR(stats.revCur)}</p>
          <div className="mt-3 h-[300px]"><RevenueChart series={stats.series} /></div>
        </section>

        {/* Network performance map — where the business is buzzing */}
        <section className="rounded-2xl bg-white p-5 shadow-(--shadow-card) lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold text-ink-900">Network performance</h2>
          <NetworkActivityMap nodes={nodeList} orders={orders} />
        </section>
      </div>

      {/* Operational health tiles — is the network up, anything stuck, SLAs kept, spine healthy */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => {
          const Icon = t.icon;
          const tone = TONE[t.tone];
          return (
            <Link key={t.label} href={t.href} className="rounded-2xl bg-white p-4 shadow-(--shadow-card) transition-shadow hover:shadow-(--shadow-hover)">
              <div className="flex items-start justify-between">
                <p className="text-xs font-semibold text-ink-500">{t.label}</p>
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone.bg}`}>
                  <Icon className={`h-4 w-4 ${tone.text}`} />
                </span>
              </div>
              <p className="mt-1 text-2xl font-bold text-ink-900">{t.value}</p>
              <p className={`mt-0.5 text-xs font-medium ${tone.text}`}>{t.status}</p>
              {t.ratio != null && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface">
                  <div className="h-full rounded-full" style={{ width: `${Math.round(t.ratio * 100)}%`, background: tone.bar }} />
                </div>
              )}
              {t.spark && <div className="mt-2"><MicroSpark values={t.spark} color={tone.bar} /></div>}
            </Link>
          );
        })}
      </div>

      {/* Revenue by line + top nodes */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-5 shadow-(--shadow-card)">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-900">Revenue by line</h2>
            <Link href="/admin/analytics" className="text-xs font-medium text-brand-700 hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {a.revenueByLine.map((r, i) => {
              const Icon = LINE_ICON[r.line] ?? Laptop;
              const share = Math.round((r.revenue / lineTotal) * 100);
              return (
                <div key={r.line} className="flex items-center gap-2.5">
                  <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: rankColor(i) }} />
                  <span className="w-24 truncate text-xs capitalize text-ink-700">{r.line}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(2, share)}%`, background: rankColor(i) }} />
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
            <h2 className="text-sm font-semibold text-ink-900">Top nodes</h2>
            <Link href="/admin/network" className="text-xs font-medium text-brand-700 hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {a.revenueByNode.slice(0, 6).map((r, i) => {
              const peak = a.revenueByNode[0]?.revenue ?? 1;
              return (
                <div key={r.nodeId} className="flex items-center gap-2.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: rankColor(i) }} />
                  <span className="w-32 truncate text-xs text-ink-700">{r.nodeName.replace(/^(Laptop Store|Dell Exclusive Store|Lenovo Exclusive Store) - /, "")}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(2, (r.revenue / peak) * 100)}%`, background: rankColor(i) }} />
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
          <h2 className="text-sm font-semibold text-ink-900">Latest orders</h2>
          <Link href="/admin/orders" className="flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
            View all orders <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-line border-t border-line">
          {orders.slice(0, 6).map((o) => (
            <button key={o.id} onClick={() => setOpenId(o.id)}
              className="grid w-full grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-surface">
              <span className="flex items-center gap-3">
                <Thumb src={imageOf(o.items[0]?.productId)} />
                <span className="font-mono text-sm text-brand-700">{o.code}</span>
              </span>
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
