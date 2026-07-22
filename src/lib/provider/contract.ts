/**
 * DataProvider — the single seam between the app and its data source.
 *
 * MockProvider (src/lib/provider/mock) implements this today over the
 * deterministic in-memory seed. SupabaseProvider (src/lib/provider/supabase)
 * implements the SAME contract later — each method body becomes a Postgres
 * query. Pages, API routes, admin and the simulation harness only ever talk
 * to this interface, so the swap is invisible to them.
 *
 * Read scoping: role/node scoping is applied INSIDE provider reads (mirroring
 * the intended Supabase RLS policies) so behavior doesn't change at swap time.
 */

import type {
  Audience,
  Category,
  Enquiry,
  EnquiryStage,
  FulfilmentPlan,
  LineType,
  Order,
  OrderStatus,
  PriceTier,
  Product,
  ProductV2,
  Quote,
  Rental,
  RentalStage,
  RentalUnit,
  RepairJob,
  RepairService,
  RepairStage,
  SerialUnit,
  StockRecord,
  StoreNode,
  SyncRecord,
  User,
} from "@/lib/types";

// ── Filters / inputs ─────────────────────────────────────────────────────────

export interface ProductFilter {
  line?: LineType;
  category?: string; // includes descendants
  brand?: string;
  priceMin?: number;
  priceMax?: number;
  /** New-line attribute filters */
  processor?: string;
  ram?: string;
  storage?: string;
  gpu?: string;
  screen?: string;
  useCase?: string;
  emiOnly?: boolean;
  search?: string;
  status?: "active" | "draft" | "archived" | "all";
  limit?: number;
  offset?: number;
}

export interface Actor {
  userId: string;
  role: User["role"];
  nodeId?: string;
}

export const SYSTEM_ACTOR: Actor = { userId: "system", role: "hq_admin" };

export interface CreateOrderInput {
  audience: Audience;
  userId?: string;
  customer: { name: string; phone: string; pincode: string };
  items: { productId: string; serial?: string; qty: number }[];
  mode: "pickup" | "delivery";
  payment: { method: Order["payment"]["method"] };
  tradeInCredit?: number;
  /** Device handed in for the credit (exchange flow) */
  tradeInDevice?: string;
  gstin?: string;
  sourceEnquiryId?: string;
}

export interface CreateEnquiryInput {
  type: Enquiry["type"];
  contact: Enquiry["contact"];
  items: { productId: string; qty: number }[];
}

export interface CreateRepairJobInput {
  customer: { name: string; phone: string; pincode: string };
  serviceType: string;
  brand: string;
  model: string;
  issue: string;
  mode: RepairJob["mode"];
  slot: { date: string; window: string };
  payAdvance: boolean;
}

export interface CreateRentalInput {
  customer: { name: string; phone: string; pincode: string; audience: Audience };
  productId: string;
  from: string;
  to: string;
}

export interface AnalyticsRange {
  fromDays?: number; // window back from "now", default 90
}

export interface Analytics {
  /** Daily revenue over the window, oldest → newest (drives the dashboard sparkline) */
  revenueByDay: { date: string; revenue: number }[];
  revenueByNode: { nodeId: string; nodeName: string; revenue: number; orders: number }[];
  revenueByLine: { line: LineType; revenue: number; orders: number }[];
  revenueBySource: { source: string; revenue: number; orders: number }[];
  conversion: { orders: number; enquiries: number; enquiryToOrderPct: number };
  repairTat: { avgDays: number; jobs: number; withinTatPct: number };
  rentalUtilisation: { unitsInFleet: number; unitsBooked: number; utilisationPct: number };
  refurbSellThrough: { unitsTotal: number; unitsSold: number; sellThroughPct: number };
  distributorLeague: { nodeId: string; nodeName: string; revenue: number; commissionPct: number; earned: number }[];
  totals: { revenue: number; orders: number; enquiries: number; repairs: number; rentals: number };
}

export interface SeedInfo {
  seededAt: string;
  counts: Record<string, number>;
}

// ── The contract ─────────────────────────────────────────────────────────────

export interface DataProvider {
  // Catalog reads
  getCategoryTree(): Promise<Category[]>;
  getCategory(slug: string): Promise<Category | undefined>;
  getCategoryTrail(slug: string): Promise<Category[]>;
  getProducts(filter?: ProductFilter): Promise<ProductV2[]>;
  getProductBySlug(slug: string): Promise<ProductV2 | undefined>;
  getProductById(id: string): Promise<ProductV2 | undefined>;
  /** Legacy adapter for existing storefront components */
  toLegacy(p: ProductV2): Product;

  // Line-specific reads
  getSerialUnits(productId: string): Promise<SerialUnit[]>;
  getRentalUnits(productId: string): Promise<RentalUnit[]>;
  getRentalAvailability(productId: string, from: string, to: string): Promise<{ available: boolean; nodeIds: string[]; unitIds: string[] }>;
  getCompatibleParts(modelQuery: string): Promise<ProductV2[]>;
  getPartsForModel(model: string): Promise<ProductV2[]>;
  getModelsForPart(productId: string): Promise<string[]>;
  getRepairServices(): Promise<RepairService[]>;

  // Stock + pricing
  getNodeStock(productId: string): Promise<StockRecord[]>;
  getTotalStock(productId: string): Promise<number>;
  getPriceTiers(productId: string): Promise<PriceTier[]>;
  resolvePrice(productId: string, audience: Audience, qty: number): Promise<{ unitPrice: number; tierApplied: boolean }>;

  // Network + routing
  getNodes(filter?: { type?: StoreNode["type"]; city?: string }): Promise<StoreNode[]>;
  getNode(id: string): Promise<StoreNode | undefined>;
  routeFulfilment(pincode: string, items: { productId: string; qty: number; serial?: string }[]): Promise<FulfilmentPlan>;
  routeRepair(pincode: string): Promise<StoreNode | undefined>;

  // Users
  getUsers(filter?: { role?: User["role"] }): Promise<User[]>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;

  // Orders
  createOrder(input: CreateOrderInput, actor: Actor): Promise<Order>;
  getOrders(filter: { status?: OrderStatus; phone?: string; nodeId?: string; audience?: Audience; limit?: number }, actor: Actor): Promise<Order[]>;
  getOrder(idOrCode: string, actor: Actor): Promise<Order | undefined>;
  transitionOrder(id: string, to: OrderStatus, actor: Actor, note?: string): Promise<Order>;

  // Enquiries
  createEnquiry(input: CreateEnquiryInput, actor: Actor): Promise<Enquiry>;
  getEnquiries(filter: { stage?: EnquiryStage; type?: Enquiry["type"]; limit?: number }, actor: Actor): Promise<Enquiry[]>;
  getEnquiry(idOrCode: string, actor: Actor): Promise<Enquiry | undefined>;
  transitionEnquiry(id: string, to: EnquiryStage, actor: Actor, note?: string): Promise<Enquiry>;
  addQuote(enquiryId: string, quote: Omit<Quote, "at">, actor: Actor): Promise<Enquiry>;
  convertEnquiryToOrder(enquiryId: string, actor: Actor): Promise<{ enquiry: Enquiry; order: Order }>;
  assignEnquiry(enquiryId: string, userId: string, actor: Actor): Promise<Enquiry>;

  // Repairs
  createRepairJob(input: CreateRepairJobInput, actor: Actor): Promise<RepairJob>;
  getRepairJobs(filter: { stage?: RepairStage; phone?: string; nodeId?: string; limit?: number }, actor: Actor): Promise<RepairJob[]>;
  getRepairJob(idOrCode: string, actor: Actor): Promise<RepairJob | undefined>;
  transitionRepairJob(id: string, to: RepairStage, actor: Actor, patch?: { diagnosis?: string; quoteAmount?: number }, note?: string): Promise<RepairJob>;

  // Rentals
  createRental(input: CreateRentalInput, actor: Actor): Promise<Rental>;
  getRentals(filter: { stage?: RentalStage; phone?: string; nodeId?: string; limit?: number }, actor: Actor): Promise<Rental[]>;
  getRental(idOrCode: string, actor: Actor): Promise<Rental | undefined>;
  transitionRental(id: string, to: RentalStage, actor: Actor, note?: string): Promise<Rental>;

  // Admin writes
  updateProduct(id: string, patch: Partial<ProductV2>, actor: Actor, opts?: { asSyncEngine?: boolean }): Promise<ProductV2>;
  overrideStock(productId: string, nodeId: string, qty: number, actor: Actor): Promise<StockRecord>;
  upsertNode(node: Partial<StoreNode> & { id?: string }, actor: Actor): Promise<StoreNode>;

  // Sync health (mock now)
  getSyncRecords(filter?: { status?: SyncRecord["status"] }): Promise<SyncRecord[]>;
  retrySync(id: string, actor: Actor): Promise<SyncRecord>;

  // Analytics
  getAnalytics(range?: AnalyticsRange): Promise<Analytics>;

  // Lifecycle
  reset(): Promise<SeedInfo>;
  getSeedInfo(): Promise<SeedInfo>;
}
