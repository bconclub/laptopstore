/**
 * Phase 0 smoke test: seed integrity + determinism.
 *   npx tsx scripts/smoke-seed.ts
 * Exit 0 = pass. Used before the HTTP-level simulation harness exists.
 */

import { buildSeed, seedCounts } from "../src/mock/seed/generate";

function fail(msg: string): never {
  console.error(`SMOKE FAIL: ${msg}`);
  process.exit(1);
}

const a = buildSeed();
const b = buildSeed();

// 1) Determinism — two builds identical
const ja = JSON.stringify(a);
const jb = JSON.stringify(b);
if (ja !== jb) fail("seed is not deterministic (two builds differ)");

const counts = seedCounts(a);
console.table(counts);

// 2) Scale expectations (plan targets)
if (counts.products < 400) fail(`too few products: ${counts.products}`);
if (counts.productsRental < 20) fail("rentals missing");
if (counts.productsSpares < 100) fail("spares missing");
if (counts.serialUnits < 120) fail("serial units missing");
if (counts.nodes < 40) fail(`network too small: ${counts.nodes}`);
if (counts.orders < 200) fail("order history missing");

// 3) Referential integrity
const pids = new Set(a.products.map((p) => p.id));
const nids = new Set(a.nodes.map((n) => n.id));
for (const u of a.serialUnits) {
  if (!pids.has(u.productId)) fail(`serial ${u.serial} → unknown product`);
  if (!nids.has(u.nodeId)) fail(`serial ${u.serial} → unknown node`);
}
for (const r of a.stock) {
  if (!pids.has(r.productId)) fail("stock → unknown product");
  if (!nids.has(r.nodeId)) fail("stock → unknown node");
}
for (const o of a.orders) {
  for (const it of o.items) if (!pids.has(it.productId)) fail(`${o.code} → unknown product`);
  for (const f of o.fulfilments) if (!nids.has(f.nodeId)) fail(`${o.code} → unknown fulfilment node`);
}

// 4) Business invariants
const dupSlugs = a.products.length - new Set(a.products.map((p) => p.slug)).size;
if (dupSlugs > 0) fail(`${dupSlugs} duplicate product slugs`);
const dupSerials = a.serialUnits.length - new Set(a.serialUnits.map((u) => u.serial)).size;
if (dupSerials > 0) fail(`${dupSerials} duplicate serials`);
const soldWithoutOrder = a.serialUnits.filter((u) => u.status === "sold" && !u.soldOrderId).length;
console.log(`serial units: sold=${a.serialUnits.filter((u) => u.status === "sold").length} (unlinked=${soldWithoutOrder})`);
const outlets = a.nodes.filter((n) => n.type === "outlet").length;
if (outlets !== 35) fail(`expected 35 outlets, got ${outlets}`);
// Spares two-way matrix: every spare fits ≥1 model
const badSpares = a.products.filter((p) => p.lineData.kind === "spares" && p.lineData.compatibleModels.length === 0);
if (badSpares.length) fail(`${badSpares.length} spares with empty compat`);
// Zero-stock products exist (for the no-phantom-stock guarantee test)
const stocked = new Set(a.stock.filter((r) => r.qty > 0).map((r) => r.productId));
const zeroStock = a.products.filter((p) => p.line !== "rental" && !stocked.has(p.id)).length;
if (zeroStock === 0) fail("expected some zero-stock products for guarantee testing");
console.log(`zero-stock products (intentional): ${zeroStock}`);
// Sync records cover all four states
const states = new Set(a.syncRecords.map((r) => r.status));
for (const st of ["synced", "failed", "stale", "pending"]) {
  if (!states.has(st as never)) fail(`sync state ${st} missing from seed`);
}

console.log("SMOKE PASS: seed deterministic + integral");
