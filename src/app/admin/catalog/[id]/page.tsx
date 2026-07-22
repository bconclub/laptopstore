"use client";

/**
 * Product detail — three titles, Zoho-owned fields read-only with lock chips,
 * website-owned fields editable, per-node stock with override, line data.
 */

import { use, useCallback, useEffect, useState } from "react";
import { LineChip, StatusChip, Th, Td, ZohoLock, api } from "@/components/admin/ui";
import { formatINR } from "@/lib/format";
import type { ProductV2, SerialUnit, StockRecord, SyncRecord } from "@/lib/types";

interface Detail {
  product: ProductV2;
  nodeStock: StockRecord[];
  serialUnits: SerialUnit[];
  priceTiers: { minQty: number; unitPrice: number }[];
  sync?: SyncRecord;
}

export default function AdminProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [d, setD] = useState<Detail | null>(null);
  const [display, setDisplay] = useState("");
  const [seo, setSeo] = useState("");
  const [msg, setMsg] = useState("");
  const [override, setOverride] = useState<{ nodeId: string; qty: string } | null>(null);

  const load = useCallback(async () => {
    const r = await api<Detail>(`/api/admin/products/${id}`);
    if (r.ok && r.data) {
      setD(r.data);
      setDisplay(r.data.product.titles.display);
      setSeo(r.data.product.titles.seo);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveTitles() {
    setMsg("");
    const r = await api(`/api/admin/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ titles: { ...d!.product.titles, display, seo } }),
    });
    setMsg(r.ok ? "Saved (website-owned)" : r.error ?? "failed");
    void load();
  }

  async function tryPriceEdit() {
    // Deliberate demo of the guard — Zoho-owned write must be rejected
    const r = await api(`/api/admin/products/${id}`, { method: "PATCH", body: JSON.stringify({ price: 1 }) });
    setMsg(r.ok ? "UNEXPECTED: price write accepted!" : `Blocked as designed: ${r.error}`);
  }

  async function saveOverride() {
    if (!override) return;
    const r = await api(`/api/admin/products/${id}/stock`, {
      method: "POST",
      body: JSON.stringify({ nodeId: override.nodeId, qty: Number(override.qty) }),
    });
    setMsg(r.ok ? `Stock override saved (${override.nodeId} → ${override.qty}) — sync marked stale` : r.error ?? "failed");
    setOverride(null);
    void load();
  }

  if (!d) return <p className="p-4 text-sm text-ink-500">Loading…</p>;
  const p = d.product;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-ink-900">{p.titles.display}</h1>
        <LineChip line={p.line} />
        {d.sync && <StatusChip value={d.sync.status} />}
      </div>
      {msg && <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">{msg}</p>}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-4 ring-1 ring-line">
          <h2 className="mb-3 text-sm font-bold text-ink-900">One product, three titles</h2>
          <label className="mb-1 block text-xs font-semibold text-ink-400">OPS · mirrors Zoho <ZohoLock /></label>
          <input value={p.titles.ops} disabled className="mb-3 w-full rounded-lg border border-line bg-surface px-3 py-2 font-mono text-xs text-ink-500" />
          <label className="mb-1 block text-xs font-semibold text-ink-400">DISPLAY · website-owned</label>
          <input value={display} onChange={(e) => setDisplay(e.target.value)} className="mb-3 w-full rounded-lg border border-line px-3 py-2 text-sm" />
          <label className="mb-1 block text-xs font-semibold text-ink-400">SEO · website-owned</label>
          <input value={seo} onChange={(e) => setSeo(e.target.value)} className="mb-3 w-full rounded-lg border border-line px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <button onClick={saveTitles} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Save titles</button>
            <button onClick={tryPriceEdit} className="rounded-lg px-4 py-2 text-sm text-ink-500 ring-1 ring-line" title="Demonstrates the Zoho-always-wins guard">
              Try editing price (guarded)
            </button>
          </div>

          <h2 className="mb-2 mt-5 text-sm font-bold text-ink-900">Zoho-owned <ZohoLock /></h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-ink-400">Price</dt><dd className="font-semibold">{formatINR(p.price)}</dd>
            <dt className="text-ink-400">MRP</dt><dd>{p.mrp ? formatINR(p.mrp) : "—"}</dd>
            <dt className="text-ink-400">SKU</dt><dd className="font-mono text-xs">{p.sku}</dd>
            <dt className="text-ink-400">Zoho record</dt><dd className="font-mono text-xs">{p.zohoRecordId ?? "pending"}</dd>
            <dt className="text-ink-400">Status</dt><dd>{p.status}</dd>
          </dl>

          {d.priceTiers.length > 0 && (
            <>
              <h2 className="mb-2 mt-5 text-sm font-bold text-ink-900">B2B price tiers</h2>
              {d.priceTiers.map((t) => (
                <p key={t.minQty} className="text-sm text-ink-700">{t.minQty}+ units → {formatINR(t.unitPrice)}/unit</p>
              ))}
            </>
          )}
        </section>

        <section className="rounded-2xl bg-white p-4 ring-1 ring-line">
          <h2 className="mb-3 text-sm font-bold text-ink-900">Stock by node <ZohoLock /></h2>
          <table className="min-w-full">
            <thead><tr><Th>Node</Th><Th>Qty</Th><Th>Override</Th></tr></thead>
            <tbody className="divide-y divide-line">
              {d.nodeStock.map((s) => (
                <tr key={s.nodeId}>
                  <Td>{s.nodeId}</Td>
                  <Td className="font-semibold">{s.qty}</Td>
                  <Td>
                    {override?.nodeId === s.nodeId ? (
                      <span className="flex items-center gap-2">
                        <input
                          value={override.qty}
                          onChange={(e) => setOverride({ nodeId: s.nodeId, qty: e.target.value.replace(/\D/g, "") })}
                          className="w-16 rounded border border-line px-2 py-1 text-sm"
                        />
                        <button onClick={saveOverride} className="text-xs font-semibold text-brand-600">save</button>
                      </span>
                    ) : (
                      <button onClick={() => setOverride({ nodeId: s.nodeId, qty: String(s.qty) })} className="text-xs text-ink-400 hover:text-brand-600">
                        override
                      </button>
                    )}
                  </Td>
                </tr>
              ))}
              {!d.nodeStock.length && <tr><Td>—</Td><Td className="text-danger">0 everywhere</Td><Td>{""}</Td></tr>}
            </tbody>
          </table>

          {p.line === "refurbished" && (
            <>
              <h2 className="mb-2 mt-5 text-sm font-bold text-ink-900">Serial units</h2>
              <table className="min-w-full">
                <thead><tr><Th>Serial</Th><Th>Grade</Th><Th>Battery</Th><Th>Node</Th><Th>Status</Th></tr></thead>
                <tbody className="divide-y divide-line">
                  {d.serialUnits.map((u) => (
                    <tr key={u.serial}>
                      <Td><span className="font-mono text-xs">{u.serial}</span></Td>
                      <Td>{u.grade}</Td>
                      <Td>{u.batteryHealthPct}%</Td>
                      <Td>{u.nodeId}</Td>
                      <Td><StatusChip value={u.status} /></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {p.lineData.kind === "spares" && (
            <>
              <h2 className="mb-2 mt-5 text-sm font-bold text-ink-900">Compatibility ({p.lineData.partNumber})</h2>
              <p className="text-sm text-ink-700">{p.lineData.compatibleModels.join(" · ")}</p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
