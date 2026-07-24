"use client";

/**
 * Product drawer — everything about one catalog product in a right panel:
 * hero image, three titles (display/SEO editable), Zoho-owned facts locked,
 * per-node stock with override, specs, line-specific data, data-gap flags.
 */

import { useCallback, useEffect, useState } from "react";
import { ImageOff, X } from "lucide-react";
import { LineChip, StatusChip, ZohoLock, api } from "@/components/admin/ui";
import { formatINR } from "@/lib/format";
import type { ProductV2, SerialUnit, StockRecord, SyncRecord } from "@/lib/types";

interface Detail {
  product: ProductV2;
  nodeStock: StockRecord[];
  serialUnits: SerialUnit[];
  priceTiers: { minQty: number; unitPrice: number }[];
  sync?: SyncRecord;
}

export function ProductDrawer({
  productId,
  nodeName,
  onClose,
  onSaved,
}: {
  productId: string | null;
  nodeName: (id: string) => string;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [d, setD] = useState<Detail | null>(null);
  const [display, setDisplay] = useState("");
  const [seo, setSeo] = useState("");
  const [msg, setMsg] = useState("");
  const [override, setOverride] = useState<{ nodeId: string; qty: string } | null>(null);
  const [imgFail, setImgFail] = useState(false);

  const load = useCallback(async () => {
    if (!productId) return;
    setD(null); setMsg(""); setImgFail(false);
    const r = await api<Detail>(`/api/admin/products/${productId}`);
    if (r.ok && r.data) {
      setD(r.data);
      setDisplay(r.data.product.titles.display);
      setSeo(r.data.product.titles.seo);
    } else setMsg(r.error ?? "Could not load product");
  }, [productId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!productId) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [productId, onClose]);

  async function saveTitles() {
    if (!d) return;
    const r = await api(`/api/admin/products/${d.product.id}`, {
      method: "PATCH",
      body: JSON.stringify({ titles: { ...d.product.titles, display, seo } }),
    });
    setMsg(r.ok ? "Saved — website-owned fields" : r.error ?? "failed");
    if (r.ok) { onSaved?.(); void load(); }
  }

  async function saveOverride() {
    if (!override || !d) return;
    const r = await api(`/api/admin/products/${d.product.id}/stock`, {
      method: "POST",
      body: JSON.stringify({ nodeId: override.nodeId, qty: Number(override.qty) }),
    });
    setMsg(r.ok ? `Stock set (${nodeName(override.nodeId)} → ${override.qty}) · sync marked stale` : r.error ?? "failed");
    setOverride(null);
    if (r.ok) { onSaved?.(); void load(); }
  }

  const open = !!productId;
  const p = d?.product;
  const img = p?.images?.[0];
  const totalStock = d?.nodeStock.reduce((s, x) => s + x.qty, 0) ?? 0;

  return (
    <>
      <div onClick={onClose} className={`fixed inset-0 z-[1200] bg-ink-900/25 transition-opacity duration-200 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} aria-hidden="true" />
      <aside
        role="dialog"
        aria-label="Product details"
        className={`fixed inset-y-0 right-0 z-[1201] flex w-full max-w-md flex-col bg-white shadow-(--shadow-float) transition-transform duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {p && d ? (
          <>
            <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
              <LineChip line={p.line} />
              {d.sync && <StatusChip value={d.sync.status} />}
              <span className="flex-1" />
              <button onClick={onClose} aria-label="Close panel" className="rounded-md p-1.5 text-ink-300 transition-colors hover:bg-surface hover:text-ink-700">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              {msg && <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">{msg}</p>}

              {/* Hero image + title */}
              <div className="flex gap-4">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface ring-1 ring-line">
                  {img && !imgFail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={p.titles.display} className="h-full w-full object-contain" onError={() => setImgFail(true)} />
                  ) : (
                    <ImageOff className="h-7 w-7 text-ink-300" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold leading-tight text-ink-900">{p.titles.display}</p>
                  <p className="mt-0.5 text-xs text-ink-400">{p.brand} · {p.id}</p>
                  <p className="mt-2 text-lg font-bold text-ink-900">{formatINR(p.price)} <ZohoLock /></p>
                  {p.mrp && p.mrp > p.price && <p className="text-xs text-ink-400 line-through">{formatINR(p.mrp)}</p>}
                  <p className={`mt-0.5 text-xs font-semibold ${totalStock === 0 ? "text-danger" : totalStock < 5 ? "text-warn" : "text-success"}`}>
                    {totalStock === 0 ? "Out of stock everywhere" : `${totalStock} in stock across ${d.nodeStock.length} node${d.nodeStock.length > 1 ? "s" : ""}`}
                  </p>
                </div>
              </div>

              {p.dataGaps.length > 0 && (
                <div className="rounded-lg bg-accent-400/15 px-3 py-2">
                  <span className="text-xs font-semibold text-warn">Data gaps: </span>
                  {p.dataGaps.map((g) => <span key={g} className="mr-1 text-xs text-warn">{g}</span>)}
                </div>
              )}

              {/* Three titles */}
              <section>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">One product, three titles</h3>
                <label className="mb-1 block text-[11px] font-semibold text-ink-400">OPS · mirrors Zoho <ZohoLock /></label>
                <input value={p.titles.ops} disabled className="mb-2 w-full rounded-lg border border-line bg-surface px-3 py-1.5 font-mono text-xs text-ink-500" />
                <label className="mb-1 block text-[11px] font-semibold text-ink-400">DISPLAY · website-owned</label>
                <input value={display} onChange={(e) => setDisplay(e.target.value)} className="mb-2 w-full rounded-lg border border-line px-3 py-1.5 text-sm" />
                <label className="mb-1 block text-[11px] font-semibold text-ink-400">SEO · website-owned</label>
                <input value={seo} onChange={(e) => setSeo(e.target.value)} className="mb-2 w-full rounded-lg border border-line px-3 py-1.5 text-sm" />
                <button onClick={saveTitles} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700">Save titles</button>
              </section>

              {/* Zoho-owned facts */}
              <section>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">Zoho-owned <ZohoLock /></h3>
                <dl className="grid grid-cols-2 gap-y-1.5 text-sm">
                  <dt className="text-ink-400">SKU</dt><dd className="text-right font-mono text-xs">{p.sku}</dd>
                  <dt className="text-ink-400">Zoho record</dt><dd className="text-right font-mono text-xs">{p.zohoRecordId ?? "pending"}</dd>
                  <dt className="text-ink-400">Status</dt><dd className="text-right">{p.status}</dd>
                  <dt className="text-ink-400">Category</dt><dd className="truncate text-right text-xs">{p.category}</dd>
                </dl>
                {d.priceTiers.length > 0 && (
                  <div className="mt-2 rounded-lg bg-surface p-2">
                    <p className="text-[11px] font-semibold text-ink-500">B2B price tiers</p>
                    {d.priceTiers.map((t) => <p key={t.minQty} className="text-xs text-ink-700">{t.minQty}+ units → {formatINR(t.unitPrice)}/unit</p>)}
                  </div>
                )}
              </section>

              {/* Specs */}
              {p.specs.length > 0 && (
                <section>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">Specs</h3>
                  <dl className="grid grid-cols-2 gap-y-1 text-sm">
                    {p.specs.map((s) => (
                      <div key={s.label} className="col-span-1 flex justify-between border-b border-line py-1 pr-3">
                        <dt className="text-ink-400">{s.label}</dt><dd className="text-ink-700">{s.value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}

              {/* Stock by node */}
              <section>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">Stock by node <ZohoLock /></h3>
                <div className="divide-y divide-line">
                  {d.nodeStock.map((s) => (
                    <div key={s.nodeId} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 py-1.5 text-sm">
                      <span className="truncate text-ink-700">{nodeName(s.nodeId)}</span>
                      <span className="w-8 text-right font-semibold">{s.qty}</span>
                      {override?.nodeId === s.nodeId ? (
                        <span className="flex items-center gap-1.5">
                          <input value={override.qty} onChange={(e) => setOverride({ nodeId: s.nodeId, qty: e.target.value.replace(/\D/g, "") })} className="w-14 rounded border border-line px-2 py-0.5 text-sm" />
                          <button onClick={saveOverride} className="text-xs font-semibold text-brand-600">save</button>
                        </span>
                      ) : (
                        <button onClick={() => setOverride({ nodeId: s.nodeId, qty: String(s.qty) })} className="text-xs text-ink-400 hover:text-brand-600">override</button>
                      )}
                    </div>
                  ))}
                  {!d.nodeStock.length && <p className="py-2 text-sm text-danger">Zero stock at every node.</p>}
                </div>
              </section>

              {/* Refurb serials */}
              {p.line === "refurbished" && d.serialUnits.length > 0 && (
                <section>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">Serial units</h3>
                  <div className="divide-y divide-line">
                    {d.serialUnits.map((u) => (
                      <div key={u.serial} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 py-1.5 text-xs">
                        <span className="truncate font-mono text-ink-600">{u.serial}</span>
                        <span>Grade {u.grade}</span>
                        <span className="text-ink-400">{u.batteryHealthPct}%</span>
                        <StatusChip value={u.status} />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Spares compat */}
              {p.lineData.kind === "spares" && (
                <section>
                  <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-400">Compatibility · {p.lineData.partNumber}</h3>
                  <p className="text-sm text-ink-700">{p.lineData.compatibleModels.join(" · ")}</p>
                </section>
              )}
            </div>
          </>
        ) : (
          <p className="p-6 text-sm text-ink-500">{msg || "Loading product…"}</p>
        )}
      </aside>
    </>
  );
}
