"use client";

/** Enquiry checkout (deck §07): B2B bulk / exchange / corporate rental → desk. */

import { useEffect, useState } from "react";
import { formatINR } from "@/lib/format";
import type { Enquiry, ProductV2 } from "@/lib/types";

type Row = ProductV2 & { availability: { totalStock: number } };

export function EnquiryClient() {
  const [products, setProducts] = useState<Row[]>([]);
  const [type, setType] = useState<"b2b_bulk" | "exchange" | "rental_corporate">("b2b_bulk");
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState(10);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [gstin, setGstin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<Enquiry | null>(null);

  useEffect(() => {
    void fetch("/api/catalog/products?line=new&limit=100")
      .then((r) => r.json())
      .then((j) => {
        const rows = (j.data ?? []) as Row[];
        setProducts(rows);
        if (rows.length) setProductId(rows[0].id);
      });
  }, []);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type,
          contact: { name, phone, company: company || undefined, gstin: gstin || undefined },
          items: [{ productId, qty }],
        }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      setDone(j.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mt-10 rounded-2xl bg-success/5 p-8 text-center ring-1 ring-success/30">
        <p className="text-3xl">✓</p>
        <h2 className="mt-2 text-xl font-bold text-ink-900">Enquiry with our B2B desk</h2>
        <p className="mt-1 font-mono text-sm text-brand-600">{done.code}</p>
        <p className="mt-3 text-sm text-ink-700">
          Requirement captured. The desk calls you back with a quote — typically within the working day.
        </p>
      </div>
    );
  }

  const selected = products.find((p) => p.id === productId);

  return (
    <div className="mt-8 max-w-xl space-y-4 rounded-2xl bg-white p-5 ring-1 ring-line">
      {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        {([["b2b_bulk", "Bulk order"], ["exchange", "Exchange"], ["rental_corporate", "Corporate rental"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setType(id)} className={`rounded-lg px-3 py-2 text-sm font-medium ${type === id ? "bg-brand-600 text-white" : "text-ink-700 ring-1 ring-line"}`}>
            {label}
          </button>
        ))}
      </div>
      <label className="block text-xs font-semibold text-ink-400">
        Product
        <select value={productId} onChange={(e) => setProductId(e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2.5 text-sm">
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.titles.display} — {formatINR(p.price)}</option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-semibold text-ink-400">
        Quantity
        <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} className="mt-1 w-full rounded-lg border border-line px-3 py-2.5 text-sm" />
      </label>
      {selected && qty >= 5 && (
        <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-800">
          Bulk pricing applies at this quantity — the desk quotes below the {formatINR(selected.price)} retail price.
        </p>
      )}
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Contact name" className="w-full rounded-lg border border-line px-3 py-2.5 text-sm" />
      <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="Mobile number" inputMode="numeric" className="w-full rounded-lg border border-line px-3 py-2.5 text-sm" />
      <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company (optional)" className="w-full rounded-lg border border-line px-3 py-2.5 text-sm" />
      <input value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} placeholder="GSTIN (for GST invoice, optional)" className="w-full rounded-lg border border-line px-3 py-2.5 text-sm" />
      <button
        disabled={busy || name.trim().length < 2 || !/^[6-9]\d{9}$/.test(phone) || !productId}
        onClick={submit}
        className="w-full rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white disabled:opacity-40"
      >
        {busy ? "Sending…" : "Send to B2B desk"}
      </button>
    </div>
  );
}
