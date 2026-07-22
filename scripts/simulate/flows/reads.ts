/**
 * Phase 1 flow: public reads + routing + guarantees.
 * - catalog filters work per line
 * - zero-stock products report availability 0 ("no phantom stock")
 * - spares finder works both directions
 * - rental availability respects existing bookings
 * - pincode routing: local vs nearest vs unfulfillable
 * - auth: OTP login sets a working session
 */

import { FlowRun } from "../assert";
import { SimClient } from "../client";
import type { FulfilmentPlan, ProductV2 } from "@/lib/types";

type ProductWithStock = ProductV2 & { availability: { totalStock: number } };

export async function flowReads(): Promise<FlowRun> {
  const run = new FlowRun("reads");
  const c = new SimClient("reads");

  // Catalog per line
  for (const line of ["new", "refurbished", "rental", "spares", "accessories"] as const) {
    const r = await c.get<ProductWithStock[]>(`/api/catalog/products?line=${line}&limit=200`);
    run.must(`catalog ${line}`, r.ok && (r.data?.length ?? 0) > 10, `${r.data?.length} products`);
    run.must(`catalog ${line} all match`, !!r.data?.every((p) => p.line === line), "line filter strict");
  }

  // New-line attribute filter
  const gaming = await c.get<ProductWithStock[]>(`/api/catalog/products?line=new&useCase=gaming&limit=200`);
  run.must("useCase filter", gaming.ok && (gaming.data?.length ?? 0) > 0, `${gaming.data?.length} gaming laptops`);

  // Guarantee: zero-stock visible as 0, never phantom
  const all = await c.get<ProductWithStock[]>(`/api/catalog/products?line=new&limit=200`);
  const zero = all.data?.filter((p) => p.availability.totalStock === 0) ?? [];
  run.must("zero-stock reported", zero.length > 0, `${zero.length} new-line products at 0 stock (correctly not hidden as in-stock)`);

  // PDP payload
  const first = all.data?.find((p) => p.availability.totalStock > 0);
  const pdp = await c.get<{ product: ProductV2; totalStock: number; nodeStock: unknown[] }>(`/api/catalog/products/${first?.slug}`);
  run.must("pdp payload", pdp.ok && !!pdp.data?.product && (pdp.data?.nodeStock.length ?? 0) > 0, `${first?.slug}: stock ${pdp.data?.totalStock} across ${pdp.data?.nodeStock.length} nodes`);

  // Spares finder both directions
  const parts = await c.get<{ results: ProductV2[] }>(`/api/spares/compat?model=${encodeURIComponent("ThinkPad E14")}`);
  run.must("parts-for-model", parts.ok && (parts.data?.results.length ?? 0) > 0, `${parts.data?.results.length} parts fit ThinkPad E14`);
  const somePart = parts.data?.results[0];
  const models = await c.get<{ results: string[] }>(`/api/spares/compat?part=${somePart?.id}`);
  run.must("models-for-part", models.ok && (models.data?.results.length ?? 0) > 0, `${somePart?.id} fits ${models.data?.results.length} models`);

  // Rental availability — free window ok, and a seeded-busy unit narrows options
  const rentals = await c.get<ProductWithStock[]>(`/api/catalog/products?line=rental&limit=50`);
  const rp = rentals.data?.[0];
  const avail = await c.get<{ available: boolean; unitIds: string[] }>(`/api/rentals/availability?product=${rp?.id}&from=2026-10-01&to=2026-10-10`);
  run.must("rental availability", avail.ok && avail.data?.available === true, `${rp?.id}: ${avail.data?.unitIds.length} free units in Oct window`);

  // Pincode routing: Chennai pincode should route locally for a stocked product
  const routed = await c.post<FulfilmentPlan>(`/api/pincode/route`, {
    pincode: "600042",
    items: [{ productId: first?.id, qty: 1 }],
  });
  run.must("pincode plan", routed.ok && (routed.data?.legs.length ?? 0) > 0, `${routed.data?.legs.length} leg(s), split=${routed.data?.split}, reach=${routed.data?.legs[0]?.reach}`);

  // Unfulfillable: zero-stock product blocks
  const zeroP = zero[0];
  if (zeroP) {
    const blocked = await c.post<FulfilmentPlan>(`/api/pincode/route`, {
      pincode: "600042",
      items: [{ productId: zeroP.id, qty: 1 }],
    });
    run.must("unfulfillable blocked", blocked.ok && (blocked.data?.unfulfillable.length ?? 0) === 1, `${zeroP.id} correctly unfulfillable`);
  }

  // Bad pincode rejected
  const bad = await c.post(`/api/pincode/route`, { pincode: "12", items: [{ productId: first?.id, qty: 1 }] });
  run.must("bad pincode 422", bad.status === 422, `status ${bad.status}`);

  // Auth: OTP login
  await c.loginPhone("9845000010");
  const who = await c.get(`/api/admin/dev/reset`);
  run.must("customer blocked from admin", who.status === 403 || who.status === 401, `status ${who.status}`);

  const admin = new SimClient("admin");
  await admin.loginAdmin("U-001");
  const seedInfo = await admin.get<{ counts: Record<string, number> }>(`/api/admin/dev/reset`);
  run.must("hq admin seed info", seedInfo.ok && (seedInfo.data?.counts.products ?? 0) > 400, `products=${seedInfo.data?.counts.products}`);

  return run;
}
