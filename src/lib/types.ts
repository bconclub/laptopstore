/**
 * Laptop Store India — entity model v2 (master catalog + operations).
 *
 * Source of truth for the whole backend: the mock provider, the API routes,
 * the admin panel, the simulation harness, and supabase/schema_v2.sql all
 * derive from these shapes. Field names here MUST match schema_v2.sql
 * column names (checked by scripts/check-schema.ts).
 *
 * Zoho ownership: some fields are synced FROM Zoho later (price, stock,
 * zohoRecordId, billing) and are read-only to the website/admin — see
 * src/lib/zoho-fields.ts.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Legacy shapes kept for the current storefront components (Phase 0-4).
// toLegacyProduct() in the mock provider adapts ProductV2 → Product.
// ─────────────────────────────────────────────────────────────────────────────

export type Condition = "new" | "refurbished";

export interface Category {
  slug: string;
  name: string;
  /** Short label used on tiles and the bottom-sheet nav */
  shortName?: string;
  description: string;
  icon: string; // lucide icon name, resolved in CategoryIcon
  image?: string;
  children?: Category[];
  /** Approx. catalog size on the live store, shown as social proof */
  productCount?: number;
  featured?: boolean;
}

export interface Spec {
  label: string;
  value: string;
}

/** Legacy storefront product shape (adapter output — do not extend). */
export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  /** Leaf category slug */
  category: string;
  condition: Condition;
  price: number; // INR, tax inclusive
  mrp?: number; // strike-through price
  images: string[];
  highlights: string[];
  specs: Spec[];
  warranty: string;
  stock: "in" | "low" | "out";
  rating?: number;
  reviewCount?: number;
  badge?: string;
}

export interface Store {
  city: string;
  area: string;
  address: string;
  phone: string;
  hours: string;
  mapsQuery: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Master catalog v2
// ─────────────────────────────────────────────────────────────────────────────

export type LineType = "new" | "refurbished" | "rental" | "spares" | "accessories";
export type Audience = "b2c" | "b2b";
export type ProductStatus = "active" | "draft" | "archived";

/** One product, three titles (deck §06). */
export interface ProductTitles {
  /** Ops title — mirrors Zoho item name, never customer-facing */
  ops: string;
  /** Display title — what the site shows */
  display: string;
  /** SEO title — page <title> / og */
  seo: string;
}

export interface ProductBase {
  /** Internal id, "P-00042" */
  id: string;
  /** Zoho item id once synced; null until the sync engine exists */
  zohoRecordId: string | null;
  sku: string;
  /** Website-owned URL slug */
  slug: string;
  line: LineType;
  status: ProductStatus;
  titles: ProductTitles;
  brand: string;
  /** Leaf category slug from the category tree */
  category: string;
  /** INR, tax inclusive — Zoho-owned */
  price: number;
  mrp?: number;
  images: string[];
  highlights: string[];
  specs: Spec[];
  warranty: string;
  rating?: number;
  reviewCount?: number;
  badge?: string;
  /** Admin data-gap flags, e.g. "missing-image", "no-seo-title" */
  dataGaps: string[];
}

export interface NewLineData {
  kind: "new";
  attrs: {
    processor: string;
    ram: string;
    storage: string;
    gpu?: string;
    screen: string;
    useCase: string[]; // gaming | work | student | creator | business | home
  };
  /** Groups variant configs of the same family */
  variantGroupId?: string;
  emiEligible: boolean;
}

export interface RefurbLineData {
  kind: "refurbished";
  /** % below new-equivalent price, shown on cards */
  savingsPct: number;
}

export interface RentalPricingTier {
  minDays: number;
  perDay: number; // INR
}

export interface RentalLineData {
  kind: "rental";
  pricingTiers: RentalPricingTier[];
  deposit: number; // INR
  audienceAllowed: Audience[];
}

export interface SparesLineData {
  kind: "spares";
  partNumber: string;
  oemType: "oem" | "compatible";
  /** Model display names this part fits (two-way finder) */
  compatibleModels: string[];
}

export interface AccessoriesLineData {
  kind: "accessories";
  crossSellSlugs: string[];
}

export type LineData =
  | NewLineData
  | RefurbLineData
  | RentalLineData
  | SparesLineData
  | AccessoriesLineData;

export type ProductV2 = ProductBase & { lineData: LineData };

/** Refurbished physical unit — serial-level, sold exactly once (deck §03). */
export interface SerialUnit {
  serial: string;
  productId: string;
  grade: "A" | "B" | "C";
  batteryHealthPct: number;
  warrantyMonths: number;
  ageMonths: number;
  source: string; // corporate buyback | exchange | distributor
  photos: string[];
  nodeId: string;
  status: "available" | "reserved" | "sold";
  soldOrderId?: string;
}

export interface RentalBookingWindow {
  from: string; // ISO date
  to: string;
  rentalId: string;
}

/** Physical rental fleet unit with its booking calendar. */
export interface RentalUnit {
  id: string;
  serial: string;
  productId: string;
  nodeId: string;
  status: "in_fleet" | "retired";
  bookings: RentalBookingWindow[];
}

/** Repair service definition (catalogue of what the desks can do). */
export interface RepairService {
  id: string;
  name: string;
  serviceTypes: string[];
  brands: string[];
  baseTatDays: number;
  advanceAmount?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Network
// ─────────────────────────────────────────────────────────────────────────────

export type NodeType = "outlet" | "distributor" | "warehouse";

export interface StoreNode {
  id: string;
  type: NodeType;
  name: string;
  city: string;
  area: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
  /** Territory labels, e.g. "Chennai South" */
  territories: string[];
  /** Pincode prefixes or full pincodes this node serves */
  pincodesServed: string[];
  stockSource: "own" | "hub";
  commissionPct?: number; // distributors only
  serviceCapable: boolean;
  rentalCapable: boolean;
  status: "active" | "inactive";
}

export interface StockRecord {
  productId: string;
  nodeId: string;
  qty: number;
}

/** B2B quantity-break price, e.g. ₹52,000/unit at 10+ (deck §04). */
export interface PriceTier {
  productId: string;
  minQty: number;
  unitPrice: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Users & roles
// ─────────────────────────────────────────────────────────────────────────────

export type Role =
  | "hq_admin"
  | "outlet_manager"
  | "distributor"
  | "repair_desk"
  | "b2b_desk"
  | "customer";

export interface User {
  id: string;
  phone: string;
  name: string;
  email?: string;
  role: Role;
  audience: Audience;
  companyName?: string;
  gstin?: string;
  /** Scope for outlet_manager / distributor / repair_desk roles */
  nodeId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Operations: orders, enquiries, repairs, rentals
// ─────────────────────────────────────────────────────────────────────────────

export interface StatusEvent {
  at: string; // ISO
  from: string;
  to: string;
  by: string; // user id or "system" | "simulation"
  note?: string;
}

export interface CustomerRef {
  name: string;
  phone: string;
  pincode: string;
}

export type OrderStatus =
  | "confirmed"
  | "processing"
  | "ready"
  | "dispatched"
  | "completed"
  | "cancelled";

export interface OrderItem {
  productId: string;
  /** Refurb purchases pin the exact unit */
  serial?: string;
  qty: number;
  unitPrice: number;
  line: LineType;
}

export type FulfilmentMode = "pickup" | "delivery";

export interface Fulfilment {
  id: string;
  nodeId: string;
  /** Indexes into Order.items covered by this dispatch */
  itemIndexes: number[];
  mode: FulfilmentMode;
  status: "pending" | "ready" | "dispatched" | "delivered";
}

export type PaymentMethod = "upi" | "card" | "emi" | "cod" | "net30";

export interface Order {
  id: string;
  /** Human code "ORD-2026-00042" */
  code: string;
  audience: Audience;
  userId?: string;
  customer: CustomerRef;
  items: OrderItem[];
  /** >1 entries = split fulfilment (deck §07) */
  fulfilments: Fulfilment[];
  status: OrderStatus;
  payment: { method: PaymentMethod; status: "paid" | "pending" | "mock" };
  tradeInCredit?: number;
  gstInvoice?: { gstin: string; number: string };
  totals: { sub: number; credit: number; grand: number };
  /** Set when converted from a B2B enquiry */
  sourceEnquiryId?: string;
  timeline: StatusEvent[];
  createdAt: string;
}

export type EnquiryType = "b2b_bulk" | "exchange" | "rental_corporate";

export type EnquiryStage =
  | "new"
  | "contacted"
  | "requirement"
  | "quoted"
  | "negotiation"
  | "order_confirmed"
  | "lost";

export interface Quote {
  at: string;
  unitPrice: number;
  qty: number;
  validDays: number;
  terms: string; // "Net-30, delivery included"
}

export interface Enquiry {
  id: string;
  code: string; // "ENQ-2026-00017"
  type: EnquiryType;
  stage: EnquiryStage;
  contact: { name: string; phone: string; company?: string; gstin?: string };
  items: { productId: string; qty: number }[];
  quotes: Quote[];
  assignedTo?: string; // user id
  convertedOrderId?: string;
  timeline: StatusEvent[];
  createdAt: string;
}

export type RepairStage =
  | "booked"
  | "received"
  | "diagnosed"
  | "quoted"
  | "approved"
  | "in_repair"
  | "ready"
  | "delivered"
  | "cancelled";

export type RepairMode = "dropoff" | "pickup" | "onsite";

export interface RepairJob {
  id: string;
  code: string; // "REP-2026-00088"
  customer: CustomerRef;
  serviceType: string;
  brand: string;
  model: string;
  issue: string;
  mode: RepairMode;
  nodeId: string;
  slot: { date: string; window: string };
  stage: RepairStage;
  diagnosis?: string;
  quoteAmount?: number;
  advancePaid: boolean;
  /** Days from booked → delivered target */
  tatDays: number;
  timeline: StatusEvent[];
  createdAt: string;
}

export type RentalStage =
  | "enquiry"
  | "availability_confirmed"
  | "agreement"
  | "deposit_paid"
  | "dispatched"
  | "active"
  | "return_due"
  | "returned"
  | "closed"
  | "cancelled";

export interface Rental {
  id: string;
  code: string; // "REN-2026-00012"
  customer: CustomerRef & { audience: Audience };
  productId: string;
  unitId?: string;
  nodeId: string;
  from: string; // ISO date
  to: string;
  tier: RentalPricingTier;
  deposit: number;
  stage: RentalStage;
  returnNodeId?: string;
  timeline: StatusEvent[];
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Zoho sync health (mock states now; real sync engine later)
// ─────────────────────────────────────────────────────────────────────────────

export type SyncStatus = "synced" | "failed" | "stale" | "pending";

export interface SyncRecord {
  id: string;
  entityType: "product" | "stock" | "price" | "order";
  entityId: string;
  zohoRecordId: string | null;
  status: SyncStatus;
  lastRunAt: string;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fulfilment routing (pincode → plan preview, deck §07)
// ─────────────────────────────────────────────────────────────────────────────

export interface FulfilmentPlanLeg {
  nodeId: string;
  nodeName: string;
  city: string;
  mode: FulfilmentMode;
  itemIndexes: number[];
  /** "local" = node serves the pincode; "nearest" = ships from stocking source */
  reach: "local" | "nearest";
  etaDays: number;
}

export interface FulfilmentPlan {
  pincode: string;
  legs: FulfilmentPlanLeg[];
  /** True when legs > 1 — one order, multiple dispatches, one tracking view */
  split: boolean;
  /** Items with no stock anywhere — must block checkout */
  unfulfillable: number[];
}
