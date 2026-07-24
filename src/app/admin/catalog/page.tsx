"use client";

/** Catalog — all six lines with thumbnails; row click opens the product drawer. */

import { useEffect, useMemo, useState } from "react";
import { ImageOff } from "lucide-react";
import { ProductDrawer } from "@/components/admin/ProductDrawer";
import { LineChip, Th, Td, ZohoLock, api } from "@/components/admin/ui";
import { formatINR } from "@/lib/format";
import type { LineType, ProductV2, StoreNode } from "@/lib/types";

type Row = ProductV2 & { totalStock: number };

const LINES: (LineType | "")[] = ["", "new", "refurbished", "rental", "spares", "accessories"];

function Thumb({ src, alt }: { src?: string; alt: string }) {
  const [fail, setFail] = useState(false);
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface ring-1 ring-line">
      {src && !fail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-contain" loading="lazy" onError={() => setFail(true)} />
      ) : (
        <ImageOff className="h-4 w-4 text-ink-300" />
      )}
    </span>
  );
}

export default function AdminCatalog() {
  const [rows, setRows] = useState<Row[]>([]);
  const [nodes, setNodes] = useState<Map<string, StoreNode>>(new Map());
  const [line, setLine] = useState<LineType | "">("");
  const [q, setQ] = useState("");
  const [gapsOnly, setGapsOnly] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    void api<StoreNode[]>("/api/admin/nodes").then((r) => setNodes(new Map((r.data ?? []).map((n) => [n.id, n]))));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ limit: "300" });
    if (line) params.set("line", line);
    if (q) params.set("q", q);
    void api<Row[]>(`/api/admin/products?${params}`).then((r) => setRows(r.data ?? []));
  }, [line, q]);

  const nodeName = (id: string) => nodes.get(id)?.name.replace(/^(Laptop Store|Dell Exclusive Store|Lenovo Exclusive Store) - /, "") ?? id;
  const visible = useMemo(() => (gapsOnly ? rows.filter((r) => r.dataGaps.length) : rows), [rows, gapsOnly]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-bold text-ink-900">Catalog</h1>
        <select value={line} onChange={(e) => setLine(e.target.value as LineType | "")} className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm">
          {LINES.map((l) => <option key={l} value={l}>{l ? l[0].toUpperCase() + l.slice(1) : "All six lines"}</option>)}
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
              <tr key={p.id} onClick={() => setOpenId(p.id)}
                className={`cursor-pointer transition-colors hover:bg-surface ${openId === p.id ? "bg-brand-50/60" : ""}`}>
                <Td>
                  <span className="flex items-center gap-3">
                    <Thumb src={p.images?.[0]} alt={p.titles.display} />
                    <span className="min-w-0">
                      <span className="block font-medium text-ink-900">{p.titles.display}</span>
                      <span className="block text-xs text-ink-400">{p.brand} · {p.id}</span>
                    </span>
                  </span>
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

      <ProductDrawer productId={openId} nodeName={nodeName} onClose={() => setOpenId(null)}
        onSaved={() => { const params = new URLSearchParams({ limit: "300" }); if (line) params.set("line", line); if (q) params.set("q", q); void api<Row[]>(`/api/admin/products?${params}`).then((r) => setRows(r.data ?? [])); }} />
    </div>
  );
}
