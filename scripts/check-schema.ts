/**
 * Cheap TS ↔ SQL drift check: every enum union in types.ts must appear
 * verbatim in schema_v2.sql's enum definitions, and key tables must exist.
 *   npx tsx scripts/check-schema.ts
 */

import { readFileSync } from "node:fs";

const sql = readFileSync("supabase/schema_v2.sql", "utf8");

function fail(msg: string): never {
  console.error(`SCHEMA DRIFT: ${msg}`);
  process.exit(1);
}

// TS unions (from src/lib/types.ts) → expected SQL enum members
const ENUMS: Record<string, string[]> = {
  line_type: ["new", "refurbished", "rental", "spares", "accessories"],
  audience: ["b2c", "b2b"],
  product_status: ["active", "draft", "archived"],
  serial_status: ["available", "reserved", "sold"],
  order_status: ["confirmed", "processing", "ready", "dispatched", "completed", "cancelled"],
  enquiry_stage: ["new", "contacted", "requirement", "quoted", "negotiation", "order_confirmed", "lost"],
  repair_stage: ["booked", "received", "diagnosed", "quoted", "approved", "in_repair", "ready", "delivered", "cancelled"],
  rental_stage: ["enquiry", "availability_confirmed", "agreement", "deposit_paid", "dispatched", "active", "return_due", "returned", "closed", "cancelled"],
  sync_status: ["synced", "failed", "stale", "pending"],
  payment_method: ["upi", "card", "emi", "cod", "net30"],
  user_role: ["hq_admin", "outlet_manager", "distributor", "repair_desk", "b2b_desk", "customer"],
  fulfilment_status: ["pending", "ready", "dispatched", "delivered"],
};

for (const [name, members] of Object.entries(ENUMS)) {
  const m = sql.match(new RegExp(`create type ${name} as enum \\(([^)]+)\\)`));
  if (!m) fail(`enum ${name} missing from schema_v2.sql`);
  const sqlMembers = m[1].split(",").map((s) => s.trim().replace(/'/g, ""));
  const missing = members.filter((x) => !sqlMembers.includes(x));
  const extra = sqlMembers.filter((x) => !members.includes(x));
  if (missing.length || extra.length) {
    fail(`enum ${name}: missing [${missing}] extra [${extra}]`);
  }
}

const TABLES = [
  "nodes", "node_pincodes", "users", "products", "price_tiers", "stock_records",
  "serial_units", "rental_units", "rental_bookings", "repair_services",
  "orders", "fulfilments", "enquiries", "enquiry_quotes", "repair_jobs",
  "rentals", "status_events", "sync_records",
];
for (const t of TABLES) {
  if (!new RegExp(`create table ${t} \\(`).test(sql)) fail(`table ${t} missing`);
}

// Zoho-owned columns must exist on products (sync-engine write targets)
for (const col of ["zoho_record_id", "sku", "price", "status"]) {
  if (!new RegExp(`\\b${col}\\b`).test(sql)) fail(`products.${col} missing`);
}

console.log(`SCHEMA OK: ${Object.keys(ENUMS).length} enums + ${TABLES.length} tables match types.ts`);
