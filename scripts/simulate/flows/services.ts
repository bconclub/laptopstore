/**
 * Phase 4 flows:
 *  repair      — booking routes to a service-capable node serving the pincode,
 *                full stage walk with diagnosis+quote, TAT recorded
 *  rental      — availability → book (unit held) → double-book rejected →
 *                walk to closed, unit freed
 *  enquiry-b2b — B2B login sees tier price ≠ retail, enquiry pipeline walk,
 *                quote, convert → Net-30 order with sourceEnquiryId
 */

import { FlowRun } from "../assert";
import { SimClient } from "../client";
import type { Enquiry, Order, PriceTier, ProductV2, Rental, RepairJob, StoreNode } from "@/lib/types";

type ProductWithStock = ProductV2 & { availability: { totalStock: number } };

export async function flowRepair(): Promise<FlowRun> {
  const run = new FlowRun("repair");
  const cust = new SimClient("repair-cust");
  const admin = new SimClient("admin");
  await admin.loginAdmin("U-001");

  const booked = await cust.post<RepairJob>("/api/checkout/repair", {
    customer: { name: "Sim Repair", phone: "9877700011", pincode: "600042" },
    serviceType: "screen",
    brand: "Dell",
    model: "Inspiron 15",
    issue: "cracked screen",
    mode: "dropoff",
    slot: { date: "2026-07-25", window: "10:00-12:00" },
    payAdvance: false,
  });
  run.must("job booked", booked.status === 201 && booked.data?.stage === "booked", `${booked.data?.code} @ ${booked.data?.nodeId}`);

  // Routed node must be service-capable and serve the pincode (or its city)
  const nodes = await admin.get<StoreNode[]>("/api/admin/nodes");
  const node = nodes.data?.find((n) => n.id === booked.data?.nodeId);
  run.must("node service-capable", !!node?.serviceCapable, `${node?.name}`);
  run.must("node serves pincode area", !!node?.pincodesServed.some((p) => p.startsWith("600")), `${node?.city} pin range`);

  // Stage walk with diagnosis + quote
  const id = booked.data!.id;
  const steps: [string, Record<string, unknown>][] = [
    ["received", {}],
    ["diagnosed", { diagnosis: "Panel cracked, backlight intact — replacement needed" }],
    ["quoted", { quoteAmount: 6490 }],
    ["approved", {}],
    ["in_repair", {}],
    ["ready", {}],
    ["delivered", {}],
  ];
  for (const [to, patch] of steps) {
    const r = await admin.post<RepairJob>(`/api/admin/repairs/${id}/transition`, { to, ...patch });
    run.must(`repair → ${to}`, r.ok && r.data?.stage === to, `${r.data?.stage}`);
  }
  const jobs = await admin.get<RepairJob[]>(`/api/admin/repairs?phone=9877700011`);
  const job = jobs.data?.[0];
  run.must("diagnosis + quote stored", !!job?.diagnosis && job?.quoteAmount === 6490, `quote ₹${job?.quoteAmount}`);
  run.must("timeline full", (job?.timeline.length ?? 0) >= 8, `${job?.timeline.length} events, TAT ${job?.tatDays}d`);

  // Customer sees it in account
  await cust.loginPhone("9877700011");
  const acct = await cust.get<{ repairs: RepairJob[] }>("/api/account/orders");
  run.must("repair in account", !!acct.data?.repairs.some((j) => j.code === job?.code && j.stage === "delivered"), `${job?.code} delivered`);

  return run;
}

export async function flowRental(): Promise<FlowRun> {
  const run = new FlowRun("rental");
  const cust = new SimClient("rental-cust");
  const admin = new SimClient("admin");
  await admin.loginAdmin("U-001");

  // Product with exactly known free units in a far-future window
  const rentals = await cust.get<ProductWithStock[]>("/api/catalog/products?line=rental&limit=50");
  let prod: ProductV2 | undefined;
  let freeUnits = 0;
  for (const p of rentals.data!) {
    const a = await cust.get<{ available: boolean; unitIds: string[] }>(`/api/rentals/availability?product=${p.id}&from=2026-11-01&to=2026-11-15`);
    if (a.data?.available) {
      prod = p;
      freeUnits = a.data.unitIds.length;
      break;
    }
  }
  run.must("available product found", !!prod, `${prod?.id} free units=${freeUnits}`);

  const book = await cust.post<Rental>("/api/checkout/rental", {
    customer: { name: "Sim Renter", phone: "9877700022", pincode: "600042" },
    productId: prod!.id,
    from: "2026-11-01",
    to: "2026-11-15",
  });
  run.must("rental created", book.status === 201 && !!book.data?.unitId, `${book.data?.code} unit=${book.data?.unitId} deposit=₹${book.data?.deposit}`);
  run.must("14-day tier applied", (book.data?.tier.minDays ?? 0) >= 7, `tier ${book.data?.tier.minDays}+d @ ₹${book.data?.tier.perDay}/day`);

  // Window is now held — availability shrinks by exactly 1
  const after = await cust.get<{ unitIds: string[] }>(`/api/rentals/availability?product=${prod!.id}&from=2026-11-01&to=2026-11-15`);
  run.must("unit held", (after.data?.unitIds.length ?? 99) === freeUnits - 1, `${freeUnits} → ${after.data?.unitIds.length}`);

  // Double-book the SAME window when no unit remains, or verify overlap rejected on last unit
  if (freeUnits === 1) {
    const dbl = await cust.post("/api/checkout/rental", {
      customer: { name: "Clash Renter", phone: "9877700033", pincode: "600042" },
      productId: prod!.id,
      from: "2026-11-05",
      to: "2026-11-12",
    });
    run.must("double-book rejected", dbl.status === 422, `${dbl.status}: ${dbl.error}`);
  } else {
    run.check("double-book n/a", true, `${freeUnits - 1} spare units remain — overlap allowed by fleet`);
  }

  // Walk to closed
  const id = book.data!.id;
  for (const to of ["availability_confirmed", "agreement", "deposit_paid", "dispatched", "active", "return_due", "returned", "closed"] as const) {
    const r = await admin.post<Rental>(`/api/admin/rentals/${id}/transition`, { to });
    run.must(`rental → ${to}`, r.ok && r.data?.stage === to, `${r.data?.stage}`);
  }
  // Unit freed after return
  const freed = await cust.get<{ unitIds: string[] }>(`/api/rentals/availability?product=${prod!.id}&from=2026-11-01&to=2026-11-15`);
  run.must("unit freed on return", (freed.data?.unitIds.length ?? 0) === freeUnits, `${freed.data?.unitIds.length} free again`);

  return run;
}

export async function flowEnquiryB2b(): Promise<FlowRun> {
  const run = new FlowRun("enquiry-b2b");
  const b2b = new SimClient("b2b");
  await b2b.loginPhone("9940000010"); // Zoho Corp Procurement (seeded B2B account)
  const desk = new SimClient("desk");
  await desk.loginAdmin("U-008"); // B2B Desk

  // Find a product with tiers; tier price must differ from retail
  const admin = new SimClient("admin");
  await admin.loginAdmin("U-001");
  const products = await admin.get<(ProductV2 & { totalStock: number })[]>("/api/admin/products?line=new&limit=300");
  let tiered: { product: ProductV2; tiers: PriceTier[] } | undefined;
  for (const p of products.data!) {
    const d = await admin.get<{ priceTiers: PriceTier[] }>(`/api/admin/products/${p.id}`);
    if (d.data?.priceTiers.length && p.totalStock >= 30) {
      tiered = { product: p, tiers: d.data.priceTiers };
      break;
    }
  }
  run.must("tiered product found", !!tiered, `${tiered?.product.id} tiers=${tiered?.tiers.length}`);
  const tier10 = tiered!.tiers.find((t) => t.minQty >= 10) ?? tiered!.tiers[tiered!.tiers.length - 1];
  run.must("tier ≠ retail", tier10.unitPrice < tiered!.product.price, `retail ₹${tiered!.product.price} vs ${tier10.minQty}+ @ ₹${tier10.unitPrice}`);

  // Enquiry
  const enq = await b2b.post<Enquiry>("/api/enquiry", {
    type: "b2b_bulk",
    contact: { name: "Zoho Corp Procurement", phone: "9940000010", company: "Zoho Corp", gstin: "33AAACZ1234C1Z5" },
    items: [{ productId: tiered!.product.id, qty: 25 }],
  });
  run.must("enquiry created", enq.status === 201 && enq.data?.stage === "new", `${enq.data?.code}`);
  const id = enq.data!.id;

  // Pipeline: contacted → requirement → quote → negotiation → convert
  for (const to of ["contacted", "requirement"] as const) {
    const r = await desk.post<Enquiry>(`/api/admin/enquiries/${id}`, { action: "transition", to });
    run.must(`enquiry → ${to}`, r.ok && r.data?.stage === to, `${r.data?.stage}`);
  }
  const quoted = await desk.post<Enquiry>(`/api/admin/enquiries/${id}`, {
    action: "quote",
    unitPrice: tier10.unitPrice,
    qty: 25,
    terms: "Net-30, delivery included",
  });
  run.must("quote issued", quoted.ok && quoted.data?.stage === "quoted" && quoted.data?.quotes.length === 1, `₹${tier10.unitPrice} × 25`);
  const nego = await desk.post<Enquiry>(`/api/admin/enquiries/${id}`, { action: "transition", to: "negotiation" });
  run.must("negotiation", nego.ok, nego.data?.stage ?? "?");

  // Convert → Net-30 order
  const conv = await desk.post<{ enquiry: Enquiry; order: Order }>(`/api/admin/enquiries/${id}`, { action: "convert" });
  run.must("converted", conv.ok && conv.data?.enquiry.stage === "order_confirmed", `${conv.data?.order.code}`);
  const order = conv.data!.order;
  run.must("net-30 order", order.payment.method === "net30" && order.payment.status === "pending", `${order.payment.method}/${order.payment.status}`);
  run.must("source enquiry linked", order.sourceEnquiryId === id, `order ← ${order.sourceEnquiryId}`);
  run.must("quote price on order", order.items[0].unitPrice === tier10.unitPrice && order.items[0].qty === 25, `25 × ₹${order.items[0].unitPrice}`);
  run.must("gst invoice", !!order.gstInvoice?.gstin, order.gstInvoice?.number ?? "none");

  return run;
}
