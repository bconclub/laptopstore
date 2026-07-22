"use client";

/** Catalog — all six lines, three titles, Zoho-lock on price, stock, data gaps. */

import Link from "next/link";
import { useEffect, useState } from "react";
import { LineChip, Th, Td, ZohoLock, api } from "@/components/admin/ui";
import { formatINR } from "@/lib/format";
import type { LineType, ProductV2 } from "@/lib/types";

type Row = ProductV2 & { totalStock: number };

const LINES: (LineType | "")[] = ["", "new", "refurbished", "rental", "spares", "accessories"];

export default function AdminCatalog() {
  const [rows, setRows] = useState<Row[]>([]);
  const [line, setLine] = useState<LineType | "">("");
  const [q, setQ] = useState("");
  const [gapsOnly, setGapsOnly] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams({ limit: "300" });
    if (line) params.set("line", line);
    if (q) params.set("q", q);
    void api<Row[]>(`/api/admin/products?${params}`).then((r) => setRows(r.data ?? []));
  }, [line, q]);

  const visible = gapsOnly ? rows.filter((r) => r.dataGaps.length) : rows;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-bold text-ink-900">Catalog</h1>
        <select value={line} onChange={(e) => setLine(e.target.value as LineType | "")} className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm">
          {LINES.map((l) => <option key={l} value={l}>{l || "All six lines"}</option>)}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title / brand / spec" className="w-64 rounded-lg border border-line bg-white px-3 py-1.5 text-sm" />
        <label className="flex items-center gap-1.5 text-sm text-ink-600">
          <input type="checkbox" checked={gapsOnly} onChange={(e) => setGapsOnly(e.target.checked)} className="accent-brand-600" />
          Data gaps only
        </label>
        <span className="text-xs text-ink-400">{visible.length} shown</span>
      </div>
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-line">
        <table className="min-w-full">
          <thead className="border-b border-line">
            <tr><Th>Product</Th><Th>Line</Th><Th>SKU / ops title</Th><Th>Price</Th><Th>Stock</Th><Th>Flags</Th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {visible.map((p) => (
              <tr key={p.id} className="hover:bg-surface">
                <Td>
                  <Link href={`/admin/catalog/${p.id}`} className="font-medium text-ink-900 hover:text-brand-700 hover:underline">
                    {p.titles.display}
                  </Link>
                  <span className="block text-xs text-ink-400">{p.brand} · {p.id}</span>
                </Td>
                <Td><LineChip line={p.line} /></Td>
                <Td><span className="font-mono text-xs">{p.sku}</span></Td>
                <Td className="font-semibold">{formatINR(p.price)}<ZohoLock /></Td>
                <Td>
                  <span className={p.totalStock === 0 ? "font-semibold text-danger" : ""}>{p.totalStock}</span>
                  <ZohoLock />
                </Td>
                <Td>
                  {p.dataGaps.map((g) => (
                    <span key={g} className="mr-1 rounded bg-accent-400/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-warn">{g}</span>
                  ))}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
