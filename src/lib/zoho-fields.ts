/**
 * Zoho vs website field ownership (deck §06: "Zoho owns the operational
 * truth; we own everything the customer and Google see").
 *
 * The sync engine (separate workstream, later) is the only writer of
 * Zoho-owned fields. Until it exists, these fields are read-only in the
 * admin and updateProduct() rejects writes to them unless the caller
 * passes asSyncEngine (used by the mock seed + future sync engine only).
 *
 * Guarantees this enforces (deck §05): never invents a price, no phantom
 * stock, Zoho always wins conflicts.
 */

export const ZOHO_OWNED_PRODUCT_FIELDS = [
  "price",
  "mrp",
  "zohoRecordId",
  "sku",
  "status", // availability comes from Zoho
] as const;

export const WEBSITE_OWNED_PRODUCT_FIELDS = [
  "slug",
  "titles", // display + seo (ops mirrors Zoho but lives in the same object; ops edits are ignored)
  "images",
  "highlights",
  "specs",
  "category",
  "badge",
  "warranty",
  "dataGaps",
] as const;

export type ZohoOwnedProductField = (typeof ZOHO_OWNED_PRODUCT_FIELDS)[number];
export type WebsiteOwnedProductField = (typeof WEBSITE_OWNED_PRODUCT_FIELDS)[number];

/** Stock quantities are Zoho-owned too — admin "stock override" writes are
 * flagged as interventions and would be overwritten by the next sync. */
export const ZOHO_OWNED_STOCK = true;

export function isZohoOwnedProductField(field: string): boolean {
  return (ZOHO_OWNED_PRODUCT_FIELDS as readonly string[]).includes(field);
}

export function rejectZohoOwnedWrites(patch: Record<string, unknown>): string[] {
  return Object.keys(patch).filter(isZohoOwnedProductField);
}
