"use client";

/** Analytics — revenue by node/line/source, conversion, TAT, utilisation, league table. */

import { useEffect, useState } from "react";
import { KpiTile, MiniBars, Th, Td, api } from "@/components/admin/ui";
import { formatINR } from "@/lib/format";
import type { Analytics } from "@/lib/provider/contract";

export default function AdminAnalytics() {
  const [a, setA] = useState<Analytics | null>(null);
  const [days, setDays] = useState(90);

  useEffect(() => {
    void api<Analytics>(`/api/admin/analytics?days=${days}`).then((r) => setA(r.data ?? null));
  }, [days]);

  if (!a) return <p className="p-4 text-sm text-ink-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-ink-900">Analytics & reporting</h1>
        {[30, 60, 90].map((d) => (
          <button key={d} onClick={() => setDays(d)} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${days === d ? "bg-brand-600 text-white" : "text-ink-700 ring-1 ring-line"}`}>
            {d}d
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label="Revenue" value={formatINR(a.totals.revenue)} sub={`${a.totals.orders} orders`} />
        <KpiTile label="Enquiry → order" value={`${a.conversion.enquiryToOrderPct}%`} sub={`${a.conversion.enquiries} enquiries`} />
        <KpiTile label="Repair turnaround" value={`${a.repairTat.avgDays}d avg`} sub={`${a.repairTat.withinTatPct}% within TAT · ${a.repairTat.jobs} delivered`} />
        <KpiTile label="Rental utilisation" value={`${a.rentalUtilisation.utilisationPct}%`} sub={`${a.rentalUtilisation.unitsBooked}/${a.rentalUtilisation.unitsInFleet} units`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl bg-white p-5 ring-1 ring-line">
          <h2 className="mb-4 text-sm font-bold text-ink-900">Revenue by line</h2>
          <MiniBars data={a.revenueByLine.map((r) => ({ label: r.line, value: r.revenue }))} />
        </section>
        <section className="rounded-2xl bg-white p-5 ring-1 ring-line">
          <h2 className="mb-4 text-sm font-bold text-ink-900">Revenue by source</h2>
          <MiniBars data={a.revenueBySource.map((r) => ({ label: r.source, value: r.revenue }))} />
          <p className="mt-3 text-xs text-ink-400">Refurb sell-through: {a.refurbSellThrough.sellThroughPct}% ({a.refurbSellThrough.unitsSold}/{a.refurbSellThrough.unitsTotal} serials)</p>
        </section>
        <section className="rounded-2xl bg-white p-5 ring-1 ring-line">
          <h2 className="mb-4 text-sm font-bold text-ink-900">Top nodes</h2>
          <MiniBars data={a.revenueByNode.slice(0, 8).map((r) => ({ label: r.nodeName, value: r.revenue }))} />
        </section>
      </div>

      <section className="rounded-2xl bg-white ring-1 ring-line">
        <h2 className="border-b border-line px-4 py-3 text-sm font-bold text-ink-900">Distributor league table</h2>
        <table className="min-w-full">
          <thead className="border-b border-line">
            <tr><Th>#</Th><Th>Distributor</Th><Th>Revenue routed</Th><Th>Commission</Th><Th>Earned</Th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {a.distributorLeague.map((d, i) => (
              <tr key={d.nodeId} className="hover:bg-surface">
                <Td>{i + 1}</Td>
                <Td>{d.nodeName}</Td>
                <Td className="font-semibold">{formatINR(d.revenue)}</Td>
                <Td>{d.commissionPct}%</Td>
                <Td>{formatINR(d.earned)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
