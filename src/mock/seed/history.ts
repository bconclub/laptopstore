/**
 * Historical operations seed — ~250 orders, 60 enquiries, 80 repair jobs,
 * 40 rentals, sync records in all four states. Powers the admin analytics,
 * tables and sync-health page before a single live write happens.
 */

import type {
  Enquiry,
  EnquiryStage,
  Order,
  OrderStatus,
  ProductV2,
  Rental,
  RentalLineData,
  RentalStage,
  RepairJob,
  RepairService,
  RepairStage,
  SerialUnit,
  StatusEvent,
  StoreNode,
  SyncRecord,
  User,
} from "@/lib/types";
import { Rng, daysAgo, isoDate, NOW_ANCHOR } from "./rng";

const FIRST = ["Rahul", "Priya", "Arjun", "Sneha", "Vikram", "Ananya", "Karthik", "Divya", "Rohan", "Meera", "Aditya", "Pooja", "Siddharth", "Lakshmi", "Imran", "Nisha", "Varun", "Deepa", "Sanjay", "Ritu", "Manoj", "Kavya", "Naveen", "Anjali", "Faisal", "Swati", "Harish", "Tanvi"];
const LAST = ["Sharma", "Menon", "Reddy", "Iyer", "Nair", "Rao", "Shetty", "Pillai", "Gupta", "Krishnan", "Verma", "Hegde", "Jain", "Bhat", "Sheikh", "Agarwal", "Kamath", "Naidu", "Kulkarni", "Saxena"];
const COMPANIES = ["Zoho Corp", "Freshworks", "TechM Solutions", "Verve Media", "NIIT Centre", "Ather Energy", "EventWorks India", "Brigade Tech Park", "CodeCraft Academy", "Nimbus Consulting", "Chennai Silks IT", "Apollo Digital"];

function person(rng: Rng) {
  return `${rng.pick(FIRST)} ${rng.pick(LAST)}`;
}
function phone(rng: Rng) {
  return `9${rng.int(500000000, 999999999)}`;
}

function walkTimeline<S extends string>(
  rng: Rng,
  path: S[],
  createdDaysAgo: number,
  stepDays: number,
): { timeline: StatusEvent[]; createdAt: string; current: S } {
  const createdAt = daysAgo(createdDaysAgo).toISOString();
  const timeline: StatusEvent[] = [];
  let t = daysAgo(createdDaysAgo).getTime();
  for (let i = 1; i < path.length; i++) {
    t += rng.int(2, Math.max(3, stepDays * 24)) * 3600_000;
    if (t > NOW_ANCHOR.getTime()) break;
    timeline.push({ at: new Date(t).toISOString(), from: path[i - 1], to: path[i], by: "system" });
  }
  const current = timeline.length ? (timeline[timeline.length - 1].to as S) : path[0];
  return { timeline, createdAt, current };
}

export interface HistorySeed {
  orders: Order[];
  enquiries: Enquiry[];
  repairJobs: RepairJob[];
  rentals: Rental[];
  syncRecords: SyncRecord[];
}

export function buildHistory(
  rng: Rng,
  products: ProductV2[],
  serialUnits: SerialUnit[],
  nodes: StoreNode[],
  users: User[],
  repairServices: RepairService[],
): HistorySeed {
  const sellable = products.filter((p) => (p.line === "new" || p.line === "accessories" || p.line === "spares") && p.status === "active");
  const refurb = products.filter((p) => p.line === "refurbished");
  const rentalProducts = products.filter((p) => p.line === "rental");
  const outlets = nodes.filter((n) => n.type === "outlet");
  const distributors = nodes.filter((n) => n.type === "distributor");
  const serviceNodes = nodes.filter((n) => n.serviceCapable);
  const rentalNodes = nodes.filter((n) => n.rentalCapable);
  const b2bUsers = users.filter((u) => u.audience === "b2b" && u.role === "customer");

  const orders: Order[] = [];
  const enquiries: Enquiry[] = [];
  const repairJobs: RepairJob[] = [];
  const rentals: Rental[] = [];
  const syncRecords: SyncRecord[] = [];

  const ORDER_PATH: OrderStatus[] = ["confirmed", "processing", "ready", "dispatched", "completed"];
  const soldUnits = serialUnits.filter((u) => u.status === "sold");

  // ── Orders (~250) ──────────────────────────────────────────────────────────
  for (let i = 0; i < 250; i++) {
    const isB2b = rng.chance(0.18);
    const isRefurb = !isB2b && rng.chance(0.25) && soldUnits.length > i;
    const split = rng.chance(0.1);
    const daysBack = rng.int(0, 90);
    const { timeline, createdAt, current } = walkTimeline(rng, ORDER_PATH, daysBack, 2);
    const node = rng.pick(rng.chance(0.85) ? outlets : distributors);
    const city = node.city;
    const pincode = node.pincodesServed[0] ?? "600042";
    const code = `ORD-2026-${String(i + 1).padStart(5, "0")}`;

    let items: Order["items"];
    if (isRefurb) {
      const unit = soldUnits[i % soldUnits.length];
      const prod = refurb.find((p) => p.id === unit.productId) ?? refurb[0];
      unit.soldOrderId = code;
      items = [{ productId: prod.id, serial: unit.serial, qty: 1, unitPrice: prod.price, line: "refurbished" }];
    } else {
      const count = isB2b ? 1 : rng.int(1, 2);
      items = rng.pickN(sellable, count).map((p) => ({
        productId: p.id,
        qty: isB2b ? rng.int(5, 25) : 1,
        unitPrice: isB2b ? Math.round(p.price * 0.92) : p.price,
        line: p.line,
      }));
    }
    const sub = items.reduce((s, it) => s + it.qty * it.unitPrice, 0);
    const credit = !isB2b && rng.chance(0.12) ? rng.int(2, 8) * 1000 : 0;

    const fulfilments: Order["fulfilments"] = split && items.length > 1
      ? items.map((_, idx) => ({
          id: `F-${code}-${idx + 1}`,
          nodeId: idx === 0 ? node.id : rng.pick(distributors).id,
          itemIndexes: [idx],
          mode: rng.chance(0.5) ? "pickup" : "delivery",
          status: current === "completed" ? "delivered" : current === "dispatched" ? "dispatched" : "pending",
        }))
      : [{
          id: `F-${code}-1`,
          nodeId: node.id,
          itemIndexes: items.map((_, idx) => idx),
          mode: rng.chance(0.5) ? "pickup" : "delivery",
          status: current === "completed" ? "delivered" : current === "dispatched" ? "dispatched" : "pending",
        }];

    const b2bUser = isB2b ? rng.pick(b2bUsers) : undefined;
    orders.push({
      id: `O-${String(i + 1).padStart(5, "0")}`,
      code,
      audience: isB2b ? "b2b" : "b2c",
      userId: b2bUser?.id,
      customer: {
        name: b2bUser?.name ?? person(rng),
        phone: b2bUser?.phone ?? phone(rng),
        pincode,
      },
      items,
      fulfilments,
      status: current,
      payment: {
        method: isB2b ? "net30" : rng.pick(["upi", "card", "emi", "cod"] as const),
        status: current === "completed" ? "paid" : isB2b ? "pending" : "paid",
      },
      tradeInCredit: credit || undefined,
      gstInvoice: b2bUser?.gstin ? { gstin: b2bUser.gstin, number: `GST-INV-${1000 + i}` } : undefined,
      totals: { sub, credit, grand: sub - credit },
      timeline,
      createdAt,
    });
    void city;
  }

  // ── Enquiries (60) ─────────────────────────────────────────────────────────
  const ENQ_PATH: EnquiryStage[] = ["new", "contacted", "requirement", "quoted", "negotiation", "order_confirmed"];
  const b2bDesk = users.find((u) => u.role === "b2b_desk");
  for (let i = 0; i < 60; i++) {
    const daysBack = rng.int(0, 60);
    const pathLen = rng.int(1, 6);
    const { timeline, createdAt, current } = walkTimeline(rng, ENQ_PATH.slice(0, pathLen + 1), daysBack, 3);
    const prod = rng.pick(sellable);
    const qty = rng.int(5, 50);
    const code = `ENQ-2026-${String(i + 1).padStart(5, "0")}`;
    const quoted = ["quoted", "negotiation", "order_confirmed"].includes(current);
    enquiries.push({
      id: `E-${String(i + 1).padStart(5, "0")}`,
      code,
      type: rng.chance(0.7) ? "b2b_bulk" : rng.chance(0.5) ? "exchange" : "rental_corporate",
      stage: current as EnquiryStage,
      contact: {
        name: person(rng),
        phone: phone(rng),
        company: rng.pick(COMPANIES),
        gstin: `33AA${rng.int(100000, 999999)}C1Z${rng.int(1, 9)}`,
      },
      items: [{ productId: prod.id, qty }],
      quotes: quoted
        ? [{
            at: timeline[Math.min(2, timeline.length - 1)]?.at ?? createdAt,
            unitPrice: Math.round(prod.price * 0.9),
            qty,
            validDays: 15,
            terms: "Net-30, delivery included",
          }]
        : [],
      assignedTo: rng.chance(0.7) ? b2bDesk?.id : undefined,
      convertedOrderId: current === "order_confirmed" ? orders[i % orders.length].id : undefined,
      timeline,
      createdAt,
    });
  }

  // ── Repair jobs (80) ───────────────────────────────────────────────────────
  const REP_PATH: RepairStage[] = ["booked", "received", "diagnosed", "quoted", "approved", "in_repair", "ready", "delivered"];
  const ISSUES = ["cracked screen", "battery draining fast", "keyboard keys not working", "not powering on", "liquid spill", "running very slow", "hinge broken", "fan noise and overheating"];
  for (let i = 0; i < 80; i++) {
    const daysBack = rng.int(0, 45);
    const svc = rng.pick(repairServices);
    const node = rng.pick(serviceNodes);
    const pathLen = rng.int(1, 8);
    const { timeline, createdAt, current } = walkTimeline(rng, REP_PATH.slice(0, pathLen + 1), daysBack, 1);
    const diagnosed = REP_PATH.indexOf(current as RepairStage) >= 2;
    repairJobs.push({
      id: `R-${String(i + 1).padStart(5, "0")}`,
      code: `REP-2026-${String(i + 1).padStart(5, "0")}`,
      customer: { name: person(rng), phone: phone(rng), pincode: node.pincodesServed[0] ?? "600042" },
      serviceType: svc.serviceTypes[0],
      brand: rng.pick(svc.brands),
      model: rng.pick(["Inspiron 15", "Pavilion 15", "IdeaPad Slim 5", "Vivobook 16", "MacBook Air", "ThinkPad E14"]),
      issue: rng.pick(ISSUES),
      mode: rng.pick(["dropoff", "dropoff", "pickup", "onsite"] as const),
      nodeId: node.id,
      slot: { date: isoDate(daysAgo(daysBack)), window: rng.pick(["10:00-12:00", "12:00-15:00", "15:00-18:00"]) },
      stage: current as RepairStage,
      diagnosis: diagnosed ? `Confirmed ${rng.pick(ISSUES)}; part available` : undefined,
      quoteAmount: diagnosed ? rng.int(8, 60) * 100 : undefined,
      advancePaid: !!svc.advanceAmount && rng.chance(0.8),
      tatDays: svc.baseTatDays + rng.int(0, 2),
      timeline,
      createdAt,
    });
  }

  // ── Rentals (40) ───────────────────────────────────────────────────────────
  const REN_PATH: RentalStage[] = ["enquiry", "availability_confirmed", "agreement", "deposit_paid", "dispatched", "active", "return_due", "returned", "closed"];
  for (let i = 0; i < 40; i++) {
    const daysBack = rng.int(0, 60);
    const prod = rng.pick(rentalProducts);
    const ld = prod.lineData as RentalLineData;
    const node = rng.pick(rentalNodes);
    const pathLen = rng.int(2, 9);
    const { timeline, createdAt, current } = walkTimeline(rng, REN_PATH.slice(0, pathLen + 1), daysBack, 2);
    const durationDays = rng.pick([7, 14, 30, 60]);
    const tier = [...ld.pricingTiers].reverse().find((t) => durationDays >= t.minDays) ?? ld.pricingTiers[0];
    const isB2b = rng.chance(0.5);
    rentals.push({
      id: `RN-${String(i + 1).padStart(5, "0")}`,
      code: `REN-2026-${String(i + 1).padStart(5, "0")}`,
      customer: {
        name: isB2b ? rng.pick(COMPANIES) : person(rng),
        phone: phone(rng),
        pincode: node.pincodesServed[0] ?? "600042",
        audience: isB2b ? "b2b" : "b2c",
      },
      productId: prod.id,
      nodeId: node.id,
      from: isoDate(daysAgo(daysBack - 2)),
      to: isoDate(daysAgo(daysBack - 2 - durationDays)),
      tier,
      deposit: ld.deposit,
      stage: current as RentalStage,
      returnNodeId: rng.chance(0.8) ? node.id : rng.pick(rentalNodes).id,
      timeline,
      createdAt,
    });
  }

  // ── Sync records (all four states — deck §09 sync health) ──────────────────
  let s = 0;
  for (const p of products) {
    s += 1;
    const roll = rng.float();
    const status = roll < 0.9 ? "synced" : roll < 0.94 ? "stale" : roll < 0.97 ? "failed" : "pending";
    syncRecords.push({
      id: `SY-${String(s).padStart(5, "0")}`,
      entityType: "product",
      entityId: p.id,
      zohoRecordId: status === "pending" ? null : p.zohoRecordId,
      status,
      lastRunAt: daysAgo(status === "stale" ? rng.int(3, 10) : 0).toISOString(),
      error: status === "failed" ? rng.pick([
        "Zoho API rate limit (429) — will retry",
        "Item not found in Zoho org (deleted upstream?)",
        "Price field mismatch: Zoho returned null",
      ]) : undefined,
    });
  }

  return { orders, enquiries, repairJobs, rentals, syncRecords };
}
