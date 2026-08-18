/**
 * RdsProvider — catalog reads over plain Postgres (AWS RDS staging/production).
 *
 * Same wiring philosophy as the SupabaseProvider:
 *   LIVE     catalog reads: products, stock, tiers, nodes, categories,
 *            resolvePrice, sync health.
 *   PENDING  ops layer (orders/enquiries/repairs/rentals) — migrates as
 *            transactional SQL in the ops migration; throws loudly until then.
 *
 * Server-side ONLY: the pg pool must never reach a client bundle. Pages using
 * it are server components / route handlers, which is already how the app
 * talks to its DataProvider.
 *
 * Env: DATABASE_URL=postgresql://user:pass@host:5432/laptopstore?sslmode=require
 * Selection: DATA_PROVIDER=rds in getProvider().
 */

import { Pool } from "pg";

import type {
  Audience,
  Category,
  PriceTier,
  Product,
  ProductV2,
  StockRecord,
  StoreNode,
  SyncRecord,
} from "@/lib/types";
import type { DataProvider, ProductFilter } from "@/lib/provider/contract";
import { MockProvider } from "@/lib/provider/mock/provider";

export function rdsConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/* eslint-disable @typescript-eslint/no-explicit-any */

// One pool per server process; survives HMR via globalThis.
const g = globalThis as unknown as { __lsRdsPool?: Pool };
function pool(): Pool {
  if (!g.__lsRdsPool) {
    g.__lsRdsPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      ssl: { rejectUnauthorized: false }, // RDS default certs; pin CA in production
    });
  }
  return g.__lsRdsPool;
}

function notImplemented(method: string): never {
  throw new Error(
    `RdsProvider.${method}: ops layer not yet migrated — catalog reads are ` +
      `live, orders/enquiries/repairs/rentals still run on the mock.`,
  );
}

function rowToProduct(r: any): ProductV2 {
  return {
    id: r.id,
    zohoRecordId: r.zoho_record_id ?? null,
    sku: r.sku,
    slug: r.slug,
    line: r.line,
    status: r.status,
    titles: { ops: r.titles_ops, display: r.titles_display, seo: r.titles_seo },
    brand: r.brand,
    category: r.category,
    price: Number(r.price),
    mrp: r.mrp == null ? undefined : Number(r.mrp),
    images: r.images ?? [],
    highlights: r.highlights ?? [],
    specs: r.specs ?? [],
    warranty: r.warranty ?? "",
    rating: r.rating == null ? undefined : Number(r.rating),
    reviewCount: r.review_count ?? undefined,
    badge: r.badge ?? undefined,
    dataGaps: r.data_gaps ?? [],
    lineData: r.line_data ?? { line: r.line },
  } as ProductV2;
}

function rowToNode(r: any): StoreNode {
  return {
    id: r.id,
    type: r.type,
    name: r.name,
    city: r.city,
    area: r.area ?? "",
    address: r.address ?? "",
    phone: r.phone ?? "",
    lat: r.lat ?? 0,
    lng: r.lng ?? 0,
    territories: r.territories ?? [],
    stockSource: r.stock_source ?? "own",
    commissionPct: r.commission_pct == null ? undefined : Number(r.commission_pct),
    serviceCapable: r.service_capable ?? false,
    rentalCapable: r.rental_capable ?? false,
    status: r.status,
  } as StoreNode;
}

export class RdsProvider implements DataProvider {
  /** Website-owned statics (category tree, legacy adapter). */
  private statics = new MockProvider();

  // ── Categories: static website-owned taxonomy ───────────────────────────────
  getCategoryTree(): Promise<Category[]> {
    return this.statics.getCategoryTree();
  }
  getCategory(slug: string): Promise<Category | undefined> {
    return this.statics.getCategory(slug);
  }
  getCategoryTrail(slug: string): Promise<Category[]> {
    return this.statics.getCategoryTrail(slug);
  }

  // ── Products ────────────────────────────────────────────────────────────────
  async getProducts(filter: ProductFilter = {}): Promise<ProductV2[]> {
    const where: string[] = [];
    const args: unknown[] = [];
    const arg = (v: unknown) => {
      args.push(v);
      return `$${args.length}`;
    };

    if (filter.status && filter.status !== "all") where.push(`status = ${arg(filter.status)}`);
    else if (!filter.status) where.push(`status = 'active'`);
    if (filter.line) where.push(`line = ${arg(filter.line)}`);
    if (filter.brand) where.push(`brand ilike ${arg(filter.brand)}`);
    if (filter.priceMin != null) where.push(`price >= ${arg(filter.priceMin)}`);
    if (filter.priceMax != null) where.push(`price <= ${arg(filter.priceMax)}`);
    if (filter.search) {
      const s = `%${filter.search.replaceAll("%", "")}%`;
      where.push(
        `(titles_display ilike ${arg(s)} or sku ilike ${arg(s)} or brand ilike ${arg(s)})`,
      );
    }
    if (filter.category) {
      // taxonomy is website-owned static data; expand descendants here
      const tree = await this.statics.getCategoryTree();
      const slugs = new Set<string>();
      const walk = (cats: Category[], under: boolean) => {
        for (const c of cats) {
          const hit = under || c.slug === filter.category;
          if (hit) slugs.add(c.slug);
          walk(c.children ?? [], hit);
        }
      };
      walk(tree, false);
      if (!slugs.size) slugs.add(filter.category);
      where.push(`category = any(${arg([...slugs])})`);
    }

    const sql = `select * from products ${where.length ? "where " + where.join(" and ") : ""}
                 order by sku limit ${Number(filter.limit ?? 1000)} offset ${Number(filter.offset ?? 0)}`;
    const { rows } = await pool().query(sql, args);
    let out = rows.map(rowToProduct);

    for (const key of ["processor", "ram", "storage", "gpu", "screen", "useCase"] as const) {
      const want = filter[key];
      if (want) {
        out = out.filter((p) => {
          const ld = p.lineData as unknown as Record<string, unknown>;
          return String(ld?.[key] ?? "")
            .toLowerCase()
            .includes(String(want).toLowerCase());
        });
      }
    }
    if (filter.emiOnly) {
      out = out.filter((p) => (p.lineData as unknown as Record<string, unknown>)?.emiAvailable);
    }
    return out;
  }

  async getProductBySlug(slug: string): Promise<ProductV2 | undefined> {
    const { rows } = await pool().query("select * from products where slug = $1", [slug]);
    return rows[0] ? rowToProduct(rows[0]) : undefined;
  }

  async getProductById(id: string): Promise<ProductV2 | undefined> {
    const { rows } = await pool().query("select * from products where id = $1", [id]);
    return rows[0] ? rowToProduct(rows[0]) : undefined;
  }

  toLegacy(p: ProductV2): Product {
    return this.statics.toLegacy(p);
  }

  // ── Stock and pricing ───────────────────────────────────────────────────────
  async getNodeStock(productId: string): Promise<StockRecord[]> {
    const { rows } = await pool().query(
      "select product_id, node_id, qty from stock_records where product_id = $1",
      [productId],
    );
    return rows.map((r) => ({ productId: r.product_id, nodeId: r.node_id, qty: r.qty }));
  }

  async getTotalStock(productId: string): Promise<number> {
    const { rows } = await pool().query(
      "select coalesce(sum(qty), 0)::int as total from stock_records where product_id = $1",
      [productId],
    );
    return rows[0]?.total ?? 0;
  }

  async getPriceTiers(productId: string): Promise<PriceTier[]> {
    const { rows } = await pool().query(
      "select product_id, min_qty, unit_price from price_tiers where product_id = $1 order by min_qty",
      [productId],
    );
    return rows.map((r) => ({
      productId: r.product_id,
      minQty: r.min_qty,
      unitPrice: Number(r.unit_price),
    }));
  }

  async resolvePrice(
    productId: string,
    audience: Audience,
    qty: number,
  ): Promise<{ unitPrice: number; tierApplied: boolean }> {
    const p = await this.getProductById(productId);
    if (!p) throw new Error(`resolvePrice: unknown product ${productId}`);
    if (audience === "b2b") {
      const tiers = await this.getPriceTiers(productId);
      const hit = [...tiers].reverse().find((t) => qty >= t.minQty);
      if (hit) return { unitPrice: hit.unitPrice, tierApplied: true };
    }
    return { unitPrice: p.price, tierApplied: false };
  }

  // ── Network ─────────────────────────────────────────────────────────────────
  async getNodes(filter?: { type?: StoreNode["type"]; city?: string }): Promise<StoreNode[]> {
    const where = ["status = 'active'"];
    const args: unknown[] = [];
    if (filter?.type) {
      args.push(filter.type);
      where.push(`type = $${args.length}`);
    }
    if (filter?.city) {
      args.push(filter.city);
      where.push(`city ilike $${args.length}`);
    }
    const { rows } = await pool().query(
      `select * from nodes where ${where.join(" and ")} order by name`,
      args,
    );
    return rows.map(rowToNode);
  }

  async getNode(id: string): Promise<StoreNode | undefined> {
    const { rows } = await pool().query("select * from nodes where id = $1", [id]);
    return rows[0] ? rowToNode(rows[0]) : undefined;
  }

  // ── Sync health ─────────────────────────────────────────────────────────────
  async getSyncRecords(filter?: { status?: SyncRecord["status"] }): Promise<SyncRecord[]> {
    const args: unknown[] = [];
    let sql = "select * from sync_records";
    if (filter?.status) {
      args.push(filter.status);
      sql += " where status = $1";
    }
    sql += " order by last_run_at desc";
    const { rows } = await pool().query(sql, args);
    return rows.map((r: any) => ({
      id: r.id,
      entityType: r.entity_type,
      entityId: r.entity_id,
      zohoRecordId: r.zoho_record_id ?? undefined,
      status: r.status,
      lastRunAt: r.last_run_at instanceof Date ? r.last_run_at.toISOString() : r.last_run_at,
      error: r.error ?? undefined,
    })) as SyncRecord[];
  }

  // ── Ops layer: pending migration ────────────────────────────────────────────
  getSerialUnits(): never { return notImplemented("getSerialUnits"); }
  getRentalUnits(): never { return notImplemented("getRentalUnits"); }
  getRentalAvailability(): never { return notImplemented("getRentalAvailability"); }
  getCompatibleParts(): never { return notImplemented("getCompatibleParts"); }
  getPartsForModel(): never { return notImplemented("getPartsForModel"); }
  getModelsForPart(): never { return notImplemented("getModelsForPart"); }
  getRepairServices(): never { return notImplemented("getRepairServices"); }
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
  retrySync(): never { return notImplemented("retrySync"); }
  getAnalytics(): never { return notImplemented("getAnalytics"); }
  reset(): never { return notImplemented("reset"); }
  getSeedInfo(): never { return notImplemented("getSeedInfo"); }
}
