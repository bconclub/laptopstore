"use client";

/** Two-way spares finder: model → parts, part → models (deck §03). */

import Link from "next/link";
import { useState } from "react";
import { formatINR } from "@/lib/format";
import type { ProductV2, SparesLineData } from "@/lib/types";

export function FinderClient() {
  const [model, setModel] = useState("");
  const [parts, setParts] = useState<ProductV2[] | null>(null);
  const [reverse, setReverse] = useState<{ part: ProductV2; models: string[] } | null>(null);
  const [busy, setBusy] = useState(false);

  async function findParts() {
    setBusy(true);
    setReverse(null);
    const r = await fetch(`/api/spares/compat?model=${encodeURIComponent(model)}`);
    const j = await r.json();
    setParts(j.ok ? j.data.results : []);
    setBusy(false);
  }

  async function findModels(part: ProductV2) {
    const r = await fetch(`/api/spares/compat?part=${part.id}`);
    const j = await r.json();
    setReverse({ part, models: j.ok ? j.data.results : [] });
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="flex gap-3">
        <input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && model.trim() && findParts()}
          placeholder="Your laptop model, e.g. ThinkPad E14, Inspiron 15, MacBook Air"
          className="flex-1 rounded-xl border border-line px-4 py-3 text-sm outline-none focus:border-brand-500"
        />
        <button disabled={!model.trim() || busy} onClick={findParts} className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white disabled:opacity-40">
          {busy ? "Searching…" : "Find parts"}
        </button>
      </div>

      {reverse && (
        <div className="rounded-2xl bg-brand-50 p-4 ring-1 ring-brand-200">
          <p className="text-sm font-semibold text-ink-900">{reverse.part.titles.display}</p>
          <p className="mt-1 text-xs text-ink-500">Part {(reverse.part.lineData as SparesLineData).partNumber} fits:</p>
          <p className="mt-1 text-sm text-brand-800">{reverse.models.join(" · ")}</p>
        </div>
      )}

      {parts && (
        <div>
          <p className="mb-3 text-sm text-ink-500">
            {parts.length ? `${parts.length} part${parts.length > 1 ? "s" : ""} fit “${model}”` : `No parts matched “${model}” — try the base model name (e.g. "ThinkPad E14")`}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {parts.map((p) => {
              const ld = p.lineData as SparesLineData;
              return (
                <div key={p.id} className="rounded-2xl bg-white p-4 ring-1 ring-line">
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-semibold text-ink-900">{p.titles.display}</p>
                    <span className={`ml-2 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${ld.oemType === "oem" ? "bg-brand-600 text-white" : "bg-surface text-ink-600 ring-1 ring-line"}`}>
                      {ld.oemType}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-ink-400">{ld.partNumber}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-bold text-ink-900">{formatINR(p.price)}</span>
                    <span className="flex gap-3 text-xs">
                      <button onClick={() => findModels(p)} className="font-medium text-brand-600 hover:underline">fits which models?</button>
                      <Link href={`/product/${p.slug}`} className="font-medium text-ink-500 hover:underline">view</Link>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
