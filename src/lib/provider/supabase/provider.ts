/**
 * SupabaseProvider — typed stub for the swap (Phase 7).
 *
 * Implements the same DataProvider contract as MockProvider. Each method
 * becomes a Postgres query against supabase/schema_v2.sql once the project
 * exists. Until then every method throws, and getProvider() never selects
 * this class — it exists so the contract stays honest at compile time and
 * the swap is "fill in the bodies + run schema + seed".
 *
 * Implementation notes for the swap:
 * - Reads: straight selects mirroring the mock filters; role scoping moves
 *   into RLS policies (JWT claims role + node_id) — keep parity with
 *   MockProvider.scopeNode().
 * - Writes: wrap create+decrement/transition pairs in RPCs so state-machine
 *   validation (assertTransition) runs inside a transaction.
 * - Zoho-owned columns: only the sync engine's service-role key may write
 *   price/mrp/sku/status/zoho_record_id/stock qty.
 */

import type { DataProvider } from "@/lib/provider/contract";
import { getSupabase, supabaseReady } from "@/lib/supabase";

function notImplemented(method: string): never {
  throw new Error(
    `SupabaseProvider.${method}: not implemented — provision the Supabase project, run supabase/schema_v2.sql, then fill in this method (see provider contract).`,
  );
}

export function supabaseConfigured(): boolean {
  return supabaseReady();
}

/* eslint-disable @typescript-eslint/no-unused-vars */
export class SupabaseProvider implements DataProvider {
  constructor() {
    if (!getSupabase()) {
      throw new Error("SupabaseProvider: NEXT_PUBLIC_SUPABASE_URL / ANON_KEY not set");
    }
  }

  getCategoryTree(): never { return notImplemented("getCategoryTree"); }
  getCategory(): never { return notImplemented("getCategory"); }
  getCategoryTrail(): never { return notImplemented("getCategoryTrail"); }
  getProducts(): never { return notImplemented("getProducts"); }
  getProductBySlug(): never { return notImplemented("getProductBySlug"); }
  getProductById(): never { return notImplemented("getProductById"); }
  toLegacy(): never { return notImplemented("toLegacy"); }
  getSerialUnits(): never { return notImplemented("getSerialUnits"); }
  getRentalUnits(): never { return notImplemented("getRentalUnits"); }
  getRentalAvailability(): never { return notImplemented("getRentalAvailability"); }
  getCompatibleParts(): never { return notImplemented("getCompatibleParts"); }
  getPartsForModel(): never { return notImplemented("getPartsForModel"); }
  getModelsForPart(): never { return notImplemented("getModelsForPart"); }
  getRepairServices(): never { return notImplemented("getRepairServices"); }
  getNodeStock(): never { return notImplemented("getNodeStock"); }
  getTotalStock(): never { return notImplemented("getTotalStock"); }
  getPriceTiers(): never { return notImplemented("getPriceTiers"); }
  resolvePrice(): never { return notImplemented("resolvePrice"); }
  getNodes(): never { return notImplemented("getNodes"); }
  getNode(): never { return notImplemented("getNode"); }
  routeFulfilment(): never { return notImplemented("routeFulfilment"); }
  routeRepair(): never { return notImplemented("routeRepair"); }
  getUsers(): never { return notImplemented("getUsers"); }
  getUserByPhone(): never { return notImplemented("getUserByPhone"); }
  getUserById(): never { return notImplemented("getUserById"); }
  createOrder(): never { return notImplemented("createOrder"); }
  getOrders(): never { return notImplemented("getOrders"); }
  getOrder(): never { return notImplemented("getOrder"); }
  transitionOrder(): never { return notImplemented("transitionOrder"); }
  createEnquiry(): never { return notImplemented("createEnquiry"); }
  getEnquiries(): never { return notImplemented("getEnquiries"); }
  getEnquiry(): never { return notImplemented("getEnquiry"); }
  transitionEnquiry(): never { return notImplemented("transitionEnquiry"); }
  addQuote(): never { return notImplemented("addQuote"); }
  convertEnquiryToOrder(): never { return notImplemented("convertEnquiryToOrder"); }
  assignEnquiry(): never { return notImplemented("assignEnquiry"); }
  createRepairJob(): never { return notImplemented("createRepairJob"); }
  getRepairJobs(): never { return notImplemented("getRepairJobs"); }
  getRepairJob(): never { return notImplemented("getRepairJob"); }
  transitionRepairJob(): never { return notImplemented("transitionRepairJob"); }
  createRental(): never { return notImplemented("createRental"); }
  getRentals(): never { return notImplemented("getRentals"); }
  getRental(): never { return notImplemented("getRental"); }
  transitionRental(): never { return notImplemented("transitionRental"); }
  updateProduct(): never { return notImplemented("updateProduct"); }
  overrideStock(): never { return notImplemented("overrideStock"); }
  upsertNode(): never { return notImplemented("upsertNode"); }
  getSyncRecords(): never { return notImplemented("getSyncRecords"); }
  retrySync(): never { return notImplemented("retrySync"); }
  getAnalytics(): never { return notImplemented("getAnalytics"); }
  reset(): never { return notImplemented("reset"); }
  getSeedInfo(): never { return notImplemented("getSeedInfo"); }
}
