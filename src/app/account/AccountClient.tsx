"use client";

/** Account-lite: phone + mock OTP (0000) → everything tied to that phone. */

import { useEffect, useState } from "react";
import { formatINR } from "@/lib/format";
import type { Order, Rental, RepairJob, StatusEvent } from "@/lib/types";

interface AccountData {
  orders: Order[];
  repairs: RepairJob[];
  rentals: Rental[];
}

function Timeline({ events }: { events: StatusEvent[] }) {
  if (!events.length) return null;
  return (
    <ol className="mt-2 space-y-1 border-l-2 border-brand-100 pl-3">
      {events.map((e, i) => (
        <li key={i} className="text-xs text-ink-500">
          <span className="font-medium text-ink-700">{e.to}</span>
          {" · "}
          {new Date(e.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </li>
      ))}
    </ol>
  );
}

const STATUS_TONE: Record<string, string> = {
  completed: "bg-success/10 text-success",
  delivered: "bg-success/10 text-success",
  closed: "bg-success/10 text-success",
  cancelled: "bg-danger/10 text-danger",
  lost: "bg-danger/10 text-danger",
};

function Chip({ value }: { value: string }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_TONE[value] ?? "bg-brand-50 text-brand-700"}`}>
      {value.replace(/_/g, " ")}
    </span>
  );
}

export function AccountClient() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"phone" | "otp" | "in">("phone");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<AccountData | null>(null);

  async function load() {
    const r = await fetch("/api/account/orders");
    const j = await r.json();
    if (j.ok) {
      setData(j.data);
      setStage("in");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function sendOtp() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/auth/otp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      setStage("otp");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/auth/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone, otp }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (stage !== "in") {
    return (
      <div className="mt-8 max-w-sm space-y-3 rounded-2xl p-5 ring-1 ring-line">
        {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        {stage === "phone" ? (
          <>
            <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="Mobile number" inputMode="numeric"
              className="w-full rounded-lg border border-line px-4 py-2.5 text-sm outline-none focus:border-brand-500" />
            <button disabled={!/^[6-9]\d{9}$/.test(phone) || busy} onClick={sendOtp}
              className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
              {busy ? "Sending…" : "Send OTP"}
            </button>
          </>
        ) : (
          <>
            <p className="text-xs text-ink-500">Demo build: OTP is 0000</p>
            <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="Enter OTP" inputMode="numeric"
              className="w-full rounded-lg border border-line px-4 py-2.5 text-sm tracking-[0.5em] outline-none focus:border-brand-500" />
            <button disabled={otp.length !== 4 || busy} onClick={verify}
              className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
              {busy ? "Verifying…" : "View my orders"}
            </button>
          </>
        )}
      </div>
    );
  }

  const empty = !data || (!data.orders.length && !data.repairs.length && !data.rentals.length);
  return (
    <div className="mt-8 space-y-8">
      {empty && <p className="rounded-2xl bg-surface p-6 text-sm text-ink-500">Nothing here yet for this number.</p>}

      {!!data?.orders.length && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">Purchases</h2>
          <div className="space-y-3">
            {data.orders.map((o) => (
              <details key={o.id} className="rounded-2xl p-4 ring-1 ring-line">
                <summary className="flex cursor-pointer items-center justify-between">
                  <span className="font-mono text-sm text-brand-700">{o.code}</span>
                  <span className="text-sm text-ink-700">{formatINR(o.totals.grand)}</span>
                  <Chip value={o.status} />
                </summary>
                <p className="mt-3 text-xs text-ink-500">
                  {o.fulfilments.length > 1 ? `${o.fulfilments.length} dispatches` : o.fulfilments[0]?.mode}
                  {o.items.some((i) => i.serial) && ` · serial ${o.items.find((i) => i.serial)?.serial}`}
                </p>
                <Timeline events={o.timeline} />
              </details>
            ))}
          </div>
        </section>
      )}

      {!!data?.repairs.length && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">Repairs</h2>
          <div className="space-y-3">
            {data.repairs.map((j) => (
              <details key={j.id} className="rounded-2xl p-4 ring-1 ring-line">
                <summary className="flex cursor-pointer items-center justify-between">
                  <span className="font-mono text-sm text-brand-700">{j.code}</span>
                  <span className="text-sm text-ink-700">{j.brand} {j.model}</span>
                  <Chip value={j.stage} />
                </summary>
                <p className="mt-3 text-xs text-ink-500">{j.issue} · TAT {j.tatDays}d{j.quoteAmount ? ` · quote ${formatINR(j.quoteAmount)}` : ""}</p>
                <Timeline events={j.timeline} />
              </details>
            ))}
          </div>
        </section>
      )}

      {!!data?.rentals.length && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">Rentals</h2>
          <div className="space-y-3">
            {data.rentals.map((r) => (
              <details key={r.id} className="rounded-2xl p-4 ring-1 ring-line">
                <summary className="flex cursor-pointer items-center justify-between">
                  <span className="font-mono text-sm text-brand-700">{r.code}</span>
                  <span className="text-sm text-ink-700">{r.from} → {r.to}</span>
                  <Chip value={r.stage} />
                </summary>
                <p className="mt-3 text-xs text-ink-500">{formatINR(r.tier.perDay)}/day · deposit {formatINR(r.deposit)}</p>
                <Timeline events={r.timeline} />
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
