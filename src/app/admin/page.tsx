"use client";

/** Admin dashboard — KPI tiles + revenue snapshots off /api/admin/analytics. */

import { useEffect, useState } from "react";
import { KpiTile, MiniBars, api } from "@/components/admin/ui";
import { formatINR } from "@/lib/format";
import type { Analytics } from "@/lib/provider/contract";

export default function AdminDashboard() {
  const [a, setA] = useState<Analytics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void api<Analytics>("/api/admin/analytics").then((r) => (r.ok ? setA(r.data!) : setError(r.error ?? "failed")));
  }, []);

  if (error) return <p className="rounded-lg bg-danger/10 p-4 text-sm text-danger">{error}</p>;
  if (!a) return <p className="p-4 text-sm text-ink-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiTile label="Revenue (90d)" value={formatINR(a.totals.revenue)} sub={`${a.totals.orders} orders`} />
        <KpiTile label="Enquiries" value={a.totals.enquiries} sub={`${a.conversion.enquiryToOrderPct}% → orders`} />
        <KpiTile label="Repairs" value={a.totals.repairs} sub={`avg TAT ${a.repairTat.avgDays}d · ${a.repairTat.withinTatPct}% on time`} />
        <KpiTile label="Rental fleet" value={`${a.rentalUtilisation.utilisationPct}%`} sub={`${a.rentalUtilisation.unitsBooked}/${a.rentalUtilisation.unitsInFleet} booked`} />
        <KpiTile label="Refurb sell-through" value={`${a.refurbSellThrough.sellThroughPct}%`} sub={`${a.refurbSellThrough.unitsSold}/${a.refurbSellThrough.unitsTotal} units`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-5 ring-1 ring-line">
          <h2 className="mb-4 text-sm font-bold text-ink-900">Revenue by line</h2>
          <MiniBars data={a.revenueByLine.map((r) => ({ label: r.line, value: r.revenue }))} />
        </section>
        <section className="rounded-2xl bg-white p-5 ring-1 ring-line">
          <h2 className="mb-4 text-sm font-bold text-ink-900">Top nodes</h2>
          <MiniBars data={a.revenueByNode.slice(0, 8).map((r) => ({ label: r.nodeName, value: r.revenue }))} />
        </section>
      </div>
    </div>
  );
}
