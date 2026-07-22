"use client";

/** Enquiries kanban — pipeline stages, quote composer, convert-to-order. */

import { useCallback, useEffect, useState } from "react";
import { StatusChip, api } from "@/components/admin/ui";
import { formatINR } from "@/lib/format";
import type { Enquiry, EnquiryStage } from "@/lib/types";

const STAGES: EnquiryStage[] = ["new", "contacted", "requirement", "quoted", "negotiation", "order_confirmed", "lost"];
const NEXT: Record<string, EnquiryStage[]> = {
  new: ["contacted", "lost"],
  contacted: ["requirement", "lost"],
  requirement: ["lost"], // quoted happens via the quote composer
  quoted: ["negotiation", "lost"],
  negotiation: ["lost"],
};

export default function AdminEnquiries() {
  const [rows, setRows] = useState<Enquiry[]>([]);
  const [msg, setMsg] = useState("");
  const [quoteFor, setQuoteFor] = useState<Enquiry | null>(null);
  const [unitPrice, setUnitPrice] = useState("");

  const load = useCallback(async () => {
    const r = await api<Enquiry[]>("/api/admin/enquiries?limit=200");
    setRows(r.data ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(id: string, payload: Record<string, unknown>) {
    setMsg("");
    const r = await api<unknown>(`/api/admin/enquiries/${id}`, { method: "POST", body: JSON.stringify(payload) });
    if (!r.ok) setMsg(r.error ?? "failed");
    else if (payload.action === "convert") {
      const d = r.data as { order?: { code: string } };
      setMsg(`Converted → order ${d.order?.code}`);
    }
    setQuoteFor(null);
    void load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-ink-900">Enquiries</h1>
        <span className="text-xs text-ink-400">{rows.length} in pipeline</span>
      </div>
      {msg && <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">{msg}</p>}

      {quoteFor && (
        <div className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-2 ring-brand-400">
          <span className="text-sm font-medium text-ink-900">Quote {quoteFor.code} ({quoteFor.items[0]?.qty} units)</span>
          <input value={unitPrice} onChange={(e) => setUnitPrice(e.target.value.replace(/\D/g, ""))} placeholder="Unit price ₹" className="w-32 rounded-lg border border-line px-3 py-1.5 text-sm" />
          <button
            disabled={!unitPrice}
            onClick={() => act(quoteFor.id, { action: "quote", unitPrice: Number(unitPrice), qty: quoteFor.items[0]?.qty ?? 1 })}
            className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            Issue quote (Net-30)
          </button>
          <button onClick={() => setQuoteFor(null)} className="text-xs text-ink-400">cancel</button>
        </div>
      )}

      <div className="grid gap-3 overflow-x-auto lg:grid-cols-4">
        {STAGES.filter((s) => s !== "lost").map((stage) => {
          const col = rows.filter((e) => e.stage === stage);
          return (
            <div key={stage} className="min-w-56 rounded-2xl bg-surface p-3">
              <p className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wide text-ink-500">
                {stage.replace(/_/g, " ")} <span className="rounded-full bg-white px-2">{col.length}</span>
              </p>
              <div className="space-y-2">
                {col.slice(0, 12).map((e) => (
                  <div key={e.id} className="rounded-xl bg-white p-3 ring-1 ring-line">
                    <p className="flex items-center justify-between">
                      <span className="font-mono text-xs text-brand-700">{e.code}</span>
                      <span className="rounded bg-surface px-1.5 text-[10px] uppercase text-ink-500">{e.type.replace(/_/g, " ")}</span>
                    </p>
                    <p className="mt-1 text-sm font-medium text-ink-900">{e.contact.company ?? e.contact.name}</p>
                    <p className="text-xs text-ink-500">{e.items[0]?.qty} × {e.items[0]?.productId}</p>
                    {e.quotes.length > 0 && (
                      <p className="mt-1 text-xs text-success">quoted {formatINR(e.quotes[e.quotes.length - 1].unitPrice)}/u</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {stage === "requirement" && (
                        <button onClick={() => { setQuoteFor(e); setUnitPrice(""); }} className="rounded bg-brand-600 px-2 py-1 text-[11px] font-semibold text-white">Quote</button>
                      )}
                      {(stage === "quoted" || stage === "negotiation") && (
                        <button onClick={() => act(e.id, { action: "convert" })} className="rounded bg-success px-2 py-1 text-[11px] font-semibold text-white">Convert → order</button>
                      )}
                      {(NEXT[stage] ?? []).map((to) => (
                        <button key={to} onClick={() => act(e.id, { action: "transition", to })} className={`rounded px-2 py-1 text-[11px] font-semibold ${to === "lost" ? "text-danger ring-1 ring-danger/30" : "text-brand-700 ring-1 ring-brand-200"}`}>
                          {to.replace(/_/g, " ")}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl bg-white p-3 ring-1 ring-line">
        <p className="text-xs text-ink-400">
          Converted: {rows.filter((e) => e.stage === "order_confirmed").length} · Lost: {rows.filter((e) => e.stage === "lost").length}
          {" — "}closed enquiries keep their <StatusChip value="order_confirmed" /> / <StatusChip value="lost" /> history in the table APIs.
        </p>
      </div>
    </div>
  );
}
