/**
 * Phase 2 flows:
 *  purchase-b2c   — order lands, stock decrements, node routed, full status
 *                   walk via admin API, illegal transition 409s, account view
 *  purchase-split — cart forced across nodes → ≥2 fulfilments; refurb serial
 *                   sells exactly once; trade-in credit in totals
 *  guarantees     — zero-stock blocks checkout
 */

import { FlowRun } from "../assert";
import { SimClient } from "../client";
import type { FulfilmentPlan, Order, ProductV2, SerialUnit, StockRecord } from "@/lib/types";

type ProductWithStock = ProductV2 & { availability: { totalStock: number } };
type Pdp = { product: ProductV2; totalStock: number; nodeStock: StockRecord[]; serialUnits: SerialUnit[] };

export async function flowPurchaseB2c(): Promise<FlowRun> {
  const run = new FlowRun("purchase-b2c");
  const buyer = new SimClient("buyer");
  await buyer.loginPhone("9845000010");
  const admin = new SimClient("admin");
  await admin.loginAdmin("U-001");

  // Pick a stocked laptop, note its stock, buy 1 with delivery to Chennai
  const list = await buyer.get<ProductWithStock[]>("/api/catalog/products?line=new&limit=100");
  const prod = list.data!.find((p) => p.availability.totalStock >= 3)!;
  const before = await buyer.get<Pdp>(`/api/catalog/products/${prod.slug}`);
  run.must("baseline stock", (before.data?.totalStock ?? 0) >= 3, `${prod.slug} stock=${before.data?.totalStock}`);

  const placed = await buyer.post<Order>("/api/checkout/purchase", {
    customer: { name: "Sim Buyer", phone: "9845000010", pincode: "600042" },
    items: [{ productId: prod.id, qty: 1 }],
    mode: "delivery",
    payment: { method: "upi" },
  });
  run.must("order created", placed.status === 201 && !!placed.data?.code, `${placed.data?.code} status=${placed.data?.status}`);
  const order = placed.data!;
  run.must("order confirmed", order.status === "confirmed", order.status);
  run.must("routed to a node", order.fulfilments.length === 1 && !!order.fulfilments[0].nodeId, `node=${order.fulfilments[0]?.nodeId}`);
  run.must("totals correct", order.totals.grand === order.items[0].unitPrice, `grand=₹${order.totals.grand}`);

  // Stock decremented
  const after = await buyer.get<Pdp>(`/api/catalog/products/${prod.slug}`);
  run.must("stock decremented", after.data!.totalStock === before.data!.totalStock - 1, `${before.data!.totalStock} → ${after.data!.totalStock}`);

  // Appears in admin list
  const adminList = await admin.get<Order[]>(`/api/admin/orders?phone=9845000010`);
  run.must("visible in admin", !!adminList.data?.some((o) => o.code === order.code), `admin sees ${order.code}`);

  // Illegal transition: confirmed → completed must 409 with allowed list
  const illegal = await admin.post(`/api/admin/orders/${order.id}/transition`, { to: "completed" });
  run.must("illegal transition 409", illegal.status === 409 && Array.isArray(illegal.allowed), `409, allowed=[${illegal.allowed?.join(",")}]`);

  // Full walk: processing → ready → dispatched → completed
  for (const to of ["processing", "ready", "dispatched", "completed"] as const) {
    const r = await admin.post<Order>(`/api/admin/orders/${order.id}/transition`, { to, note: `sim → ${to}` });
    run.must(`transition ${to}`, r.ok && r.data?.status === to, `${r.data?.status}`);
  }
  const done = await admin.get<Order>(`/api/admin/orders/${order.id}`);
  run.must("timeline complete", (done.data?.timeline.length ?? 0) >= 5, `${done.data?.timeline.length} events`);
  run.must("payment settled", done.data?.payment.status === "paid", done.data?.payment.status ?? "?");
  run.must("fulfilment delivered", done.data?.fulfilments.every((f) => f.status === "delivered") ?? false, "all legs delivered");

  // Customer sees it in account
  const acct = await buyer.get<{ orders: Order[] }>("/api/account/orders");
  run.must("account tracking", !!acct.data?.orders.some((o) => o.code === order.code && o.status === "completed"), `account shows ${order.code} completed`);

  return run;
}

export async function flowPurchaseSplit(): Promise<FlowRun> {
  const run = new FlowRun("purchase-split");
  const buyer = new SimClient("split-buyer");
  const admin = new SimClient("admin");
  await admin.loginAdmin("U-001");

  // Find two products stocked at DISJOINT node sets → guaranteed split
  const list = await buyer.get<ProductWithStock[]>("/api/catalog/products?limit=200");
  const stocked = list.data!.filter((p) => p.availability.totalStock > 0 && p.line !== "rental");
  let a: ProductV2 | undefined, b: ProductV2 | undefined;
  outer: for (const p1 of stocked.slice(0, 40)) {
    const s1 = await buyer.get<Pdp>(`/api/catalog/products/${p1.slug}`);
    const n1 = new Set(s1.data!.nodeStock.map((r) => r.nodeId));
    for (const p2 of stocked.slice(0, 40)) {
      if (p1.id === p2.id) continue;
      const s2 = await buyer.get<Pdp>(`/api/catalog/products/${p2.slug}`);
      if (s2.data!.nodeStock.every((r) => !n1.has(r.nodeId))) {
        a = p1; b = p2;
        break outer;
      }
    }
  }
  run.must("disjoint pair found", !!a && !!b, `${a?.id} vs ${b?.id}`);

  // Plan preview shows split
  const plan = await buyer.post<FulfilmentPlan>("/api/pincode/route", {
    pincode: "560001",
    items: [{ productId: a!.id, qty: 1 }, { productId: b!.id, qty: 1 }],
  });
  run.must("plan is split", plan.data?.split === true && (plan.data?.legs.length ?? 0) >= 2, `${plan.data?.legs.length} legs`);

  // Order with trade-in credit
  const placed = await buyer.post<Order>("/api/checkout/purchase", {
    customer: { name: "Split Buyer", phone: "9900011122", pincode: "560001" },
    items: [{ productId: a!.id, qty: 1 }, { productId: b!.id, qty: 1 }],
    mode: "delivery",
    payment: { method: "card" },
    tradeInCredit: 5000,
  });
  run.must("split order created", placed.status === 201, placed.data?.code ?? placed.error ?? "?");
  run.must("≥2 fulfilments", (placed.data?.fulfilments.length ?? 0) >= 2, `${placed.data?.fulfilments.length} dispatches, one order`);
  const sub = placed.data!.items.reduce((s, it) => s + it.qty * it.unitPrice, 0);
  run.must("trade-in in totals", placed.data!.totals.grand === sub - 5000, `sub=₹${sub} − ₹5000 = ₹${placed.data!.totals.grand}`);

  // Refurb serial sells exactly once
  const refurbs = await buyer.get<ProductWithStock[]>("/api/catalog/products?line=refurbished&limit=100");
  const rp = refurbs.data!.find((p) => p.availability.totalStock > 0)!;
  const pdp = await buyer.get<Pdp>(`/api/catalog/products/${rp.slug}`);
  const unit = pdp.data!.serialUnits[0];
  run.must("serial unit listed", !!unit, `${unit?.serial} grade=${unit?.grade} battery=${unit?.batteryHealthPct}%`);

  const buy1 = await buyer.post<Order>("/api/checkout/purchase", {
    customer: { name: "Refurb Buyer", phone: "9900022233", pincode: "600017" },
    items: [{ productId: rp.id, serial: unit.serial, qty: 1 }],
    mode: "pickup",
    payment: { method: "upi" },
  });
  run.must("serial purchase ok", buy1.status === 201 && buy1.data?.items[0].serial === unit.serial, `${buy1.data?.code} pinned ${unit.serial}`);

  const buy2 = await buyer.post("/api/checkout/purchase", {
    customer: { name: "Copycat", phone: "9900033344", pincode: "600017" },
    items: [{ productId: rp.id, serial: unit.serial, qty: 1 }],
    mode: "pickup",
    payment: { method: "upi" },
  });
  run.must("serial sells once", buy2.status === 422, `second sale rejected (${buy2.status}: ${buy2.error})`);

  return run;
}

export async function flowGuarantees(): Promise<FlowRun> {
  const run = new FlowRun("guarantees");
  const c = new SimClient("guard");

  // Zero-stock product cannot be bought
  const list = await c.get<ProductWithStock[]>("/api/catalog/products?limit=200");
  const zero = list.data!.find((p) => p.availability.totalStock === 0 && p.line !== "rental")!;
  run.must("zero-stock product exists", !!zero, zero?.id ?? "none");
  const attempt = await c.post("/api/checkout/purchase", {
    customer: { name: "Ghost Buyer", phone: "9900044455", pincode: "600042" },
    items: [{ productId: zero.id, qty: 1 }],
    mode: "delivery",
    payment: { method: "upi" },
  });
  run.must("phantom stock blocked", attempt.status === 422, `checkout rejected (${attempt.status}: ${attempt.error})`);

  // Zoho-owned fields are read-only — "never invents a price, Zoho always wins"
  const admin = new SimClient("admin");
  await admin.loginAdmin("U-001");
  const anyP = list.data![0];
  const priceHack = await admin.patch(`/api/admin/products/${anyP.id}`, { price: 1 });
  run.must("zoho-owned price write rejected", priceHack.status === 422 && /read-only|Zoho/i.test(priceHack.error ?? ""), `${priceHack.status}: ${priceHack.error}`);
  const titleEdit = await admin.patch(`/api/admin/products/${anyP.id}`, { titles: { ...anyP.titles, seo: "Sim SEO title | Laptop Store" } });
  run.must("website-owned title write ok", titleEdit.ok, `seo title updated on ${anyP.id}`);

  return run;
}
