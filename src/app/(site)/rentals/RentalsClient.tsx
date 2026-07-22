"use client";

/** Rentals: fleet cards with tier pricing → date-range availability → booking. */

import Image from "next/image";
import { useEffect, useState } from "react";
import { formatINR } from "@/lib/format";
import type { ProductV2, Rental, RentalLineData } from "@/lib/types";

type Row = ProductV2 & { availability: { totalStock: number } };

export function RentalsClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [active, setActive] = useState<Row | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [avail, setAvail] = useState<{ available: boolean; unitIds: string[] } | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pincode, setPincode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [booked, setBooked] = useState<Rental | null>(null);

  useEffect(() => {
    void fetch("/api/catalog/products?line=rental&limit=60")
      .then((r) => r.json())
      .then((j) => setRows(j.data ?? []));
  }, []);

  async function checkAvail() {
    setError("");
    setAvail(null);
    const r = await fetch(`/api/rentals/availability?product=${active!.id}&from=${from}&to=${to}`);
    const j = await r.json();
    if (!j.ok) return setError(j.error);
    setAvail(j.data);
  }

  async function book() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/checkout/rental", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ customer: { name, phone, pincode }, productId: active!.id, from, to }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      setBooked(j.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Booking failed");
    } finally {
      setBusy(false);
    }
  }

  if (booked) {
    return (
      <div className="mt-10 max-w-xl rounded-2xl bg-success/5 p-8 text-center ring-1 ring-success/30">
        <p className="text-3xl">✓</p>
        <h2 className="mt-2 text-xl font-bold text-ink-900">Rental reserved</h2>
        <p className="mt-1 font-mono text-sm text-brand-600">{booked.code}</p>
        <p className="mt-3 text-sm text-ink-700">
          Unit held for {booked.from} → {booked.to} at {formatINR(booked.tier.perDay)}/day.
          Deposit {formatINR(booked.deposit)} due at agreement — our rentals desk calls you to complete it.
        </p>
        <a href="/account" className="mt-5 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white">Track rental</a>
      </div>
    );
  }

  return (
    <div className="mt-8">
      {!active ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((p) => {
            const ld = p.lineData as RentalLineData;
            return (
              <button key={p.id} onClick={() => setActive(p)} className="rounded-2xl bg-white p-4 text-left ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-(--shadow-card)">
                <div className="relative mb-3 h-36 w-full">
                  <Image src={p.images[0]} alt={p.titles.display} fill sizes="300px" className="object-contain" />
                </div>
                <p className="text-sm font-semibold text-ink-900">{p.titles.display}</p>
                <p className="mt-1 text-xs text-ink-500">{p.availability.totalStock} in fleet</p>
                <div className="mt-2 space-y-0.5 text-xs text-ink-700">
                  {ld.pricingTiers.map((t) => (
                    <p key={t.minDays}><span className="font-semibold text-brand-700">{formatINR(t.perDay)}/day</span> for {t.minDays}+ days</p>
                  ))}
                </div>
                <p className="mt-2 text-xs text-ink-400">Deposit {formatINR(ld.deposit)}</p>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="max-w-xl space-y-4 rounded-2xl bg-white p-5 ring-1 ring-line">
          <button onClick={() => { setActive(null); setAvail(null); }} className="text-xs text-ink-500 hover:text-brand-600">← All rental laptops</button>
          <h2 className="font-semibold text-ink-900">{active.titles.display}</h2>
          {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          <div className="flex gap-3">
            <label className="flex-1 text-xs text-ink-500">From
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm" />
            </label>
            <label className="flex-1 text-xs text-ink-500">To
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm" />
            </label>
          </div>
          <button disabled={!from || !to || from >= to} onClick={checkAvail} className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
            Check availability
          </button>
          {avail && (avail.available ? (
            <div className="space-y-3 rounded-xl bg-success/5 p-4 ring-1 ring-success/20">
              <p className="text-sm font-medium text-success">{avail.unitIds.length} unit{avail.unitIds.length > 1 ? "s" : ""} free for your dates</p>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name / company" className="w-full rounded-lg border border-line px-3 py-2 text-sm" />
              <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="Mobile number" inputMode="numeric" className="w-full rounded-lg border border-line px-3 py-2 text-sm" />
              <input value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Delivery pincode" inputMode="numeric" className="w-full rounded-lg border border-line px-3 py-2 text-sm" />
              <button
                disabled={busy || name.trim().length < 2 || !/^[6-9]\d{9}$/.test(phone) || !/^\d{6}$/.test(pincode)}
                onClick={book}
                className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                {busy ? "Reserving…" : "Reserve unit"}
              </button>
            </div>
          ) : (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">No unit free for those dates — try shifting the window.</p>
          ))}
        </div>
      )}
    </div>
  );
}
