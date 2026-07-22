/**
 * MockProvider — full DataProvider over the deterministic in-memory seed.
 * Same behavior contract the SupabaseProvider must honour later: state
 * machines validate transitions, Zoho-owned fields reject writes, role
 * scoping happens in reads (mirrors intended RLS).
 */

import { categories, categoryTrail, findCategory } from "@/data/categories";
import {
  ENQUIRY_MACHINE,
  ORDER_MACHINE,
  RENTAL_MACHINE,
  REPAIR_MACHINE,
  assertTransition,
} from "@/lib/state-machines";
import type {
  Actor,
  Analytics,
  AnalyticsRange,
  CreateEnquiryInput,
  CreateOrderInput,
  CreateRentalInput,
  CreateRepairJobInput,
  DataProvider,
  ProductFilter,
  SeedInfo,
} from "@/lib/provider/contract";
import { rejectZohoOwnedWrites } from "@/lib/zoho-fields";
import type {
  Audience,
  Category,
  Enquiry,
  EnquiryStage,
  FulfilmentPlan,
  Order,
  OrderStatus,
  PriceTier,
  Product,
  ProductV2,
  Quote,
  Rental,
  RentalLineData,
  RentalStage,
  RentalUnit,
  RepairJob,
  RepairService,
  RepairStage,
  SerialUnit,
  StatusEvent,
  StockRecord,
  StoreNode,
  SyncRecord,
  User,
} from "@/lib/types";
import { routePlan, routeRepairNode } from "./routing";
import { getStore, persist, resetStore, storeCounts, type MockStore } from "./store";

const nowIso = () => new Date().toISOString();

function event(from: string, to: string, by: string, note?: string): StatusEvent {
  return { at: nowIso(), from, to, by, note };
}

function slugsUnder(slug: string): Set<string> {
  const cat = findCategory(slug);
  if (!cat) return new Set([slug]);
  const collect = (c: Category): string[] => [c.slug, ...(c.children?.flatMap(collect) ?? [])];
  return new Set(collect(cat));
}

/** Role scoping mirror of intended RLS: outlet/distributor/repair users see
 * only their node's operations; hq + b2b desk see everything. */
function scopeNode(actor: Actor): string | undefined {
  if (["outlet_manager", "distributor", "repair_desk"].includes(actor.role)) return actor.nodeId;
  return undefined;
}

export class MockProvider implements DataProvider {
  // ── Catalog ────────────────────────────────────────────────────────────────

  async getCategoryTree(): Promise<Category[]> {
    return categories;
  }

  async getCategory(slug: string): Promise<Category | undefined> {
    return findCategory(slug);
  }

  async getCategoryTrail(slug: string): Promise<Category[]> {
    return categoryTrail(slug);
  }

  async getProducts(filter: ProductFilter = {}): Promise<ProductV2[]> {
    const s = await getStore();
    let out = s.products;
    const status = filter.status ?? "active";
    if (status !== "all") out = out.filter((p) => p.status === status);
    if (filter.line) out = out.filter((p) => p.line === filter.line);
    if (filter.brand) out = out.filter((p) => p.brand.toLowerCase() === filter.brand!.toLowerCase());
    if (filter.category) {
      const under = slugsUnder(filter.category);
      out = out.filter((p) => under.has(p.category));
    }
    if (filter.priceMin != null) out = out.filter((p) => p.price >= filter.priceMin!);
    if (filter.priceMax != null) out = out.filter((p) => p.price <= filter.priceMax!);
    if (filter.emiOnly) out = out.filter((p) => p.lineData.kind === "new" && p.lineData.emiEligible);
    for (const attr of ["processor", "ram", "storage", "gpu", "screen", "useCase"] as const) {
      const v = filter[attr];
      if (!v) continue;
      out = out.filter((p) => {
        if (p.lineData.kind !== "new") return false;
        const a = p.lineData.attrs;
        if (attr === "useCase") return a.useCase.includes(v);
        return String(a[attr] ?? "").toLowerCase().includes(v.toLowerCase());
      });
    }
    if (filter.search) {
      const terms = filter.search.trim().toLowerCase().split(/\s+/);
      out = out.filter((p) => {
        const hay = `${p.titles.display} ${p.brand} ${p.line} ${p.specs.map((x) => x.value).join(" ")}`.toLowerCase();
        return terms.every((t) => hay.includes(t));
      });
    }
    const offset = filter.offset ?? 0;
    return out.slice(offset, filter.limit ? offset + filter.limit : undefined);
  }

  async getProductBySlug(slug: string): Promise<ProductV2 | undefined> {
    const s = await getStore();
    return s.products.find((p) => p.slug === slug);
  }

  async getProductById(id: string): Promise<ProductV2 | undefined> {
    const s = await getStore();
    return s.products.find((p) => p.id === id);
  }

  toLegacy(p: ProductV2): Product {
    // Legacy stock derived lazily from total stock is async-hostile; the
    // adapter reports "in" and PDPs fetch real per-node stock separately.
    return {
      id: p.id,
      slug: p.slug,
      name: p.titles.display,
      brand: p.brand,
      category: p.category,
      condition: p.line === "refurbished" ? "refurbished" : "new",
      price: p.price,
      mrp: p.mrp,
      images: p.images,
      highlights: p.highlights,
      specs: p.specs,
      warranty: p.warranty,
      stock: "in",
      rating: p.rating,
      reviewCount: p.reviewCount,
      badge: p.badge,
    };
  }

  // ── Line-specific ──────────────────────────────────────────────────────────

  async getSerialUnits(productId: string): Promise<SerialUnit[]> {
    const s = await getStore();
    return s.serialUnits.filter((u) => u.productId === productId);
  }

  async getRentalUnits(productId: string): Promise<RentalUnit[]> {
    const s = await getStore();
    return s.rentalUnits.filter((u) => u.productId === productId);
  }

  async getRentalAvailability(productId: string, from: string, to: string) {
    const s = await getStore();
    const units = s.rentalUnits.filter((u) => u.productId === productId && u.status === "in_fleet");
    const free = units.filter((u) =>
      u.bookings.every((b) => to < b.from || from > b.to),
    );
    return {
      available: free.length > 0,
      nodeIds: [...new Set(free.map((u) => u.nodeId))],
      unitIds: free.map((u) => u.id),
    };
  }

  async getCompatibleParts(modelQuery: string): Promise<ProductV2[]> {
    const s = await getStore();
    const q = modelQuery.trim().toLowerCase();
    if (!q) return [];
    return s.products.filter(
      (p) =>
        p.line === "spares" &&
        p.status === "active" &&
        p.lineData.kind === "spares" &&
        p.lineData.compatibleModels.some((m) => m.toLowerCase().includes(q)),
    );
  }

  async getPartsForModel(model: string): Promise<ProductV2[]> {
    return this.getCompatibleParts(model);
  }

  async getModelsForPart(productId: string): Promise<string[]> {
    const p = await this.getProductById(productId);
    return p?.lineData.kind === "spares" ? p.lineData.compatibleModels : [];
  }

  async getRepairServices(): Promise<RepairService[]> {
    const s = await getStore();
    return s.repairServices;
  }

  // ── Stock + pricing ────────────────────────────────────────────────────────

  async getNodeStock(productId: string): Promise<StockRecord[]> {
    const s = await getStore();
    return s.stock.filter((r) => r.productId === productId && r.qty > 0);
  }

  async getTotalStock(productId: string): Promise<number> {
    const rows = await this.getNodeStock(productId);
    return rows.reduce((sum, r) => sum + r.qty, 0);
  }

  async getPriceTiers(productId: string): Promise<PriceTier[]> {
    const s = await getStore();
    return s.priceTiers
      .filter((t) => t.productId === productId)
      .sort((a, b) => a.minQty - b.minQty);
  }

  async resolvePrice(productId: string, audience: Audience, qty: number) {
    const s = await getStore();
    const p = s.products.find((x) => x.id === productId);
    if (!p) throw new Error(`resolvePrice: unknown product ${productId}`);
    if (audience === "b2b") {
      const tiers = await this.getPriceTiers(productId);
      const tier = [...tiers].reverse().find((t) => qty >= t.minQty);
      if (tier) return { unitPrice: tier.unitPrice, tierApplied: true };
    }
    return { unitPrice: p.price, tierApplied: false };
  }

  // ── Network + routing ──────────────────────────────────────────────────────

  async getNodes(filter?: { type?: StoreNode["type"]; city?: string }): Promise<StoreNode[]> {
    const s = await getStore();
    let out = s.nodes;
    if (filter?.type) out = out.filter((n) => n.type === filter.type);
    if (filter?.city) out = out.filter((n) => n.city.toLowerCase() === filter.city!.toLowerCase());
    return out;
  }

  async getNode(id: string): Promise<StoreNode | undefined> {
    const s = await getStore();
    return s.nodes.find((n) => n.id === id);
  }

  async routeFulfilment(pincode: string, items: { productId: string; qty: number; serial?: string }[]): Promise<FulfilmentPlan> {
    const s = await getStore();
    const serialNodes = new Map(s.serialUnits.map((u) => [u.serial, u.nodeId]));
    return routePlan(pincode, items, s.nodes, s.stock, serialNodes);
  }

  async routeRepair(pincode: string): Promise<StoreNode | undefined> {
    const s = await getStore();
    return routeRepairNode(pincode, s.nodes);
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  async getUsers(filter?: { role?: User["role"] }): Promise<User[]> {
    const s = await getStore();
    return filter?.role ? s.users.filter((u) => u.role === filter.role) : s.users;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const s = await getStore();
    return s.users.find((u) => u.phone === phone);
  }

  async getUserById(id: string): Promise<User | undefined> {
    const s = await getStore();
    return s.users.find((u) => u.id === id);
  }

  // ── Orders ─────────────────────────────────────────────────────────────────

  async createOrder(input: CreateOrderInput, actor: Actor): Promise<Order> {
    const s = await getStore();
    if (!input.items.length) throw new Error("Order needs at least one item");

    // Resolve prices + validate stock/serials
    const items: Order["items"] = [];
    for (const it of input.items) {
      const p = s.products.find((x) => x.id === it.productId);
      if (!p) throw new Error(`Unknown product ${it.productId}`);
      if (it.serial) {
        const unit = s.serialUnits.find((u) => u.serial === it.serial);
        if (!unit || unit.productId !== p.id) throw new Error(`Unknown serial ${it.serial}`);
        if (unit.status !== "available") throw new Error(`Serial ${it.serial} is ${unit.status} — refurbished units sell exactly once`);
      } else {
        const total = s.stock.filter((r) => r.productId === p.id).reduce((sum, r) => sum + r.qty, 0);
        if (total < it.qty) throw new Error(`Insufficient stock for ${p.titles.display} (have ${total}, need ${it.qty})`);
      }
      const { unitPrice } = await this.resolvePrice(p.id, input.audience, it.qty);
      items.push({ productId: p.id, serial: it.serial, qty: it.qty, unitPrice, line: p.line });
    }

    // Route fulfilment
    const plan = await this.routeFulfilment(input.customer.pincode, input.items);
    if (plan.unfulfillable.length) {
      throw new Error(`Items not fulfillable: indexes ${plan.unfulfillable.join(",")}`);
    }

    s.counters.order += 1;
    const n = s.counters.order;
    const code = `ORD-2026-${String(n).padStart(5, "0")}`;
    const sub = items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);
    const credit = input.tradeInCredit ?? 0;

    const fulfilments: Order["fulfilments"] = plan.legs.map((leg, i) => ({
      id: `F-${code}-${i + 1}`,
      nodeId: leg.nodeId,
      itemIndexes: leg.itemIndexes,
      mode: input.mode === "pickup" && leg.reach === "local" ? "pickup" : "delivery",
      status: "pending",
    }));

    const order: Order = {
      id: `O-${String(n).padStart(5, "0")}`,
      code,
      audience: input.audience,
      userId: input.userId,
      customer: input.customer,
      items,
      fulfilments,
      status: "confirmed",
      payment: {
        method: input.payment.method,
        status: input.payment.method === "net30" ? "pending" : "mock",
      },
      tradeInCredit: credit || undefined,
      gstInvoice: input.gstin ? { gstin: input.gstin, number: `GST-INV-${2000 + n}` } : undefined,
      totals: { sub, credit, grand: sub - credit },
      sourceEnquiryId: input.sourceEnquiryId,
      timeline: [event("(new)", "confirmed", actor.userId)],
      createdAt: nowIso(),
    };

    // Decrement stock / mark serials — at the fulfilment node
    for (const [idx, it] of items.entries()) {
      if (it.serial) {
        const unit = s.serialUnits.find((u) => u.serial === it.serial)!;
        unit.status = "sold";
        unit.soldOrderId = order.code;
      } else {
        const leg = fulfilments.find((f) => f.itemIndexes.includes(idx))!;
        const rec = s.stock.find((r) => r.productId === it.productId && r.nodeId === leg.nodeId && r.qty >= it.qty)
          ?? s.stock.find((r) => r.productId === it.productId && r.qty >= it.qty);
        if (rec) rec.qty -= it.qty;
      }
    }

    s.orders.unshift(order);
    persist(s);
    return order;
  }

  async getOrders(filter: { status?: OrderStatus; phone?: string; nodeId?: string; audience?: Audience; limit?: number }, actor: Actor): Promise<Order[]> {
    const s = await getStore();
    let out = s.orders;
    const nodeScope = scopeNode(actor) ?? filter.nodeId;
    if (nodeScope) out = out.filter((o) => o.fulfilments.some((f) => f.nodeId === nodeScope));
    if (filter.status) out = out.filter((o) => o.status === filter.status);
    if (filter.phone) out = out.filter((o) => o.customer.phone === filter.phone);
    if (filter.audience) out = out.filter((o) => o.audience === filter.audience);
    return out.slice(0, filter.limit ?? 100);
  }

  async getOrder(idOrCode: string, actor: Actor): Promise<Order | undefined> {
    const s = await getStore();
    const o = s.orders.find((x) => x.id === idOrCode || x.code === idOrCode);
    const nodeScope = scopeNode(actor);
    if (o && nodeScope && !o.fulfilments.some((f) => f.nodeId === nodeScope)) return undefined;
    return o;
  }

  async transitionOrder(id: string, to: OrderStatus, actor: Actor, note?: string): Promise<Order> {
    const s = await getStore();
    const o = s.orders.find((x) => x.id === id || x.code === id);
    if (!o) throw new Error(`Order ${id} not found`);
    assertTransition("Order", ORDER_MACHINE, o.status, to);
    o.timeline.push(event(o.status, to, actor.userId, note));
    o.status = to;
    if (to === "dispatched") o.fulfilments.forEach((f) => { if (f.status === "pending" || f.status === "ready") f.status = "dispatched"; });
    if (to === "ready") o.fulfilments.forEach((f) => { if (f.status === "pending") f.status = "ready"; });
    if (to === "completed") {
      o.fulfilments.forEach((f) => { f.status = "delivered"; });
      if (o.payment.status !== "paid") o.payment.status = "paid";
    }
    persist(s);
    return o;
  }

  // ── Enquiries ──────────────────────────────────────────────────────────────

  async createEnquiry(input: CreateEnquiryInput, actor: Actor): Promise<Enquiry> {
    const s = await getStore();
    s.counters.enquiry += 1;
    const n = s.counters.enquiry;
    const enquiry: Enquiry = {
      id: `E-${String(n).padStart(5, "0")}`,
      code: `ENQ-2026-${String(n).padStart(5, "0")}`,
      type: input.type,
      stage: "new",
      contact: input.contact,
      items: input.items,
      quotes: [],
      timeline: [event("(new)", "new", actor.userId)],
      createdAt: nowIso(),
    };
    s.enquiries.unshift(enquiry);
    persist(s);
    return enquiry;
  }

  async getEnquiries(filter: { stage?: EnquiryStage; type?: Enquiry["type"]; limit?: number }, _actor: Actor): Promise<Enquiry[]> {
    const s = await getStore();
    let out = s.enquiries;
    if (filter.stage) out = out.filter((e) => e.stage === filter.stage);
    if (filter.type) out = out.filter((e) => e.type === filter.type);
    return out.slice(0, filter.limit ?? 100);
  }

  async getEnquiry(idOrCode: string, _actor: Actor): Promise<Enquiry | undefined> {
    const s = await getStore();
    return s.enquiries.find((e) => e.id === idOrCode || e.code === idOrCode);
  }

  async transitionEnquiry(id: string, to: EnquiryStage, actor: Actor, note?: string): Promise<Enquiry> {
    const s = await getStore();
    const e = s.enquiries.find((x) => x.id === id || x.code === id);
    if (!e) throw new Error(`Enquiry ${id} not found`);
    assertTransition("Enquiry", ENQUIRY_MACHINE, e.stage, to);
    e.timeline.push(event(e.stage, to, actor.userId, note));
    e.stage = to;
    persist(s);
    return e;
  }

  async addQuote(enquiryId: string, quote: Omit<Quote, "at">, actor: Actor): Promise<Enquiry> {
    const s = await getStore();
    const e = s.enquiries.find((x) => x.id === enquiryId || x.code === enquiryId);
    if (!e) throw new Error(`Enquiry ${enquiryId} not found`);
    e.quotes.push({ ...quote, at: nowIso() });
    if (e.stage === "requirement") {
      e.timeline.push(event(e.stage, "quoted", actor.userId, "Quote issued"));
      e.stage = "quoted";
    }
    persist(s);
    return e;
  }

  async convertEnquiryToOrder(enquiryId: string, actor: Actor): Promise<{ enquiry: Enquiry; order: Order }> {
    const s = await getStore();
    const e = s.enquiries.find((x) => x.id === enquiryId || x.code === enquiryId);
    if (!e) throw new Error(`Enquiry ${enquiryId} not found`);
    if (!e.quotes.length) throw new Error("Cannot convert an enquiry without a quote");
    assertTransition("Enquiry", ENQUIRY_MACHINE, e.stage, "order_confirmed");
    const lastQuote = e.quotes[e.quotes.length - 1];

    const order = await this.createOrder(
      {
        audience: "b2b",
        customer: { name: e.contact.company ?? e.contact.name, phone: e.contact.phone, pincode: "600042" },
        items: e.items.map((it) => ({ productId: it.productId, qty: it.qty })),
        mode: "delivery",
        payment: { method: "net30" },
        gstin: e.contact.gstin,
        sourceEnquiryId: e.id,
      },
      actor,
    );
    // Quote price wins over tier price
    order.items.forEach((it) => { it.unitPrice = lastQuote.unitPrice; });
    order.totals.sub = order.items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);
    order.totals.grand = order.totals.sub - order.totals.credit;

    e.timeline.push(event(e.stage, "order_confirmed", actor.userId, `Converted to ${order.code}`));
    e.stage = "order_confirmed";
    e.convertedOrderId = order.id;
    persist(s);
    return { enquiry: e, order };
  }

  async assignEnquiry(enquiryId: string, userId: string, _actor: Actor): Promise<Enquiry> {
    const s = await getStore();
    const e = s.enquiries.find((x) => x.id === enquiryId || x.code === enquiryId);
    if (!e) throw new Error(`Enquiry ${enquiryId} not found`);
    e.assignedTo = userId;
    persist(s);
    return e;
  }

  // ── Repairs ────────────────────────────────────────────────────────────────

  async createRepairJob(input: CreateRepairJobInput, actor: Actor): Promise<RepairJob> {
    const s = await getStore();
    const node = await this.routeRepair(input.customer.pincode);
    if (!node) throw new Error("No service-capable node available");
    const svc = s.repairServices.find((x) => x.serviceTypes.includes(input.serviceType)) ?? s.repairServices[0];
    s.counters.repair += 1;
    const n = s.counters.repair;
    const job: RepairJob = {
      id: `R-${String(n).padStart(5, "0")}`,
      code: `REP-2026-${String(n).padStart(5, "0")}`,
      customer: input.customer,
      serviceType: input.serviceType,
      brand: input.brand,
      model: input.model,
      issue: input.issue,
      mode: input.mode,
      nodeId: node.id,
      slot: input.slot,
      stage: "booked",
      advancePaid: input.payAdvance,
      tatDays: svc.baseTatDays,
      timeline: [event("(new)", "booked", actor.userId)],
      createdAt: nowIso(),
    };
    s.repairJobs.unshift(job);
    persist(s);
    return job;
  }

  async getRepairJobs(filter: { stage?: RepairStage; phone?: string; nodeId?: string; limit?: number }, actor: Actor): Promise<RepairJob[]> {
    const s = await getStore();
    let out = s.repairJobs;
    const nodeScope = scopeNode(actor) ?? filter.nodeId;
    if (nodeScope) out = out.filter((j) => j.nodeId === nodeScope);
    if (filter.stage) out = out.filter((j) => j.stage === filter.stage);
    if (filter.phone) out = out.filter((j) => j.customer.phone === filter.phone);
    return out.slice(0, filter.limit ?? 100);
  }

  async getRepairJob(idOrCode: string, _actor: Actor): Promise<RepairJob | undefined> {
    const s = await getStore();
    return s.repairJobs.find((j) => j.id === idOrCode || j.code === idOrCode);
  }

  async transitionRepairJob(id: string, to: RepairStage, actor: Actor, patch?: { diagnosis?: string; quoteAmount?: number }, note?: string): Promise<RepairJob> {
    const s = await getStore();
    const j = s.repairJobs.find((x) => x.id === id || x.code === id);
    if (!j) throw new Error(`Repair job ${id} not found`);
    assertTransition("RepairJob", REPAIR_MACHINE, j.stage, to);
    if (patch?.diagnosis) j.diagnosis = patch.diagnosis;
    if (patch?.quoteAmount != null) j.quoteAmount = patch.quoteAmount;
    j.timeline.push(event(j.stage, to, actor.userId, note));
    j.stage = to;
    persist(s);
    return j;
  }

  // ── Rentals ────────────────────────────────────────────────────────────────

  async createRental(input: CreateRentalInput, actor: Actor): Promise<Rental> {
    const s = await getStore();
    const p = s.products.find((x) => x.id === input.productId);
    if (!p || p.lineData.kind !== "rental") throw new Error(`${input.productId} is not a rental product`);
    const ld = p.lineData as RentalLineData;
    const avail = await this.getRentalAvailability(input.productId, input.from, input.to);
    if (!avail.available) throw new Error("No unit available for those dates");

    const unitId = avail.unitIds[0];
    const unit = s.rentalUnits.find((u) => u.id === unitId)!;
    const days = Math.max(1, Math.round((new Date(input.to).getTime() - new Date(input.from).getTime()) / 86400_000));
    const tier = [...ld.pricingTiers].reverse().find((t) => days >= t.minDays) ?? ld.pricingTiers[0];

    s.counters.rental += 1;
    const n = s.counters.rental;
    const rental: Rental = {
      id: `RN-${String(n).padStart(5, "0")}`,
      code: `REN-2026-${String(n).padStart(5, "0")}`,
      customer: input.customer,
      productId: input.productId,
      unitId,
      nodeId: unit.nodeId,
      from: input.from,
      to: input.to,
      tier,
      deposit: ld.deposit,
      stage: "enquiry",
      timeline: [event("(new)", "enquiry", actor.userId)],
      createdAt: nowIso(),
    };
    // Reserve the window immediately (double-booking guard)
    unit.bookings.push({ from: input.from, to: input.to, rentalId: rental.id });
    s.rentals.unshift(rental);
    persist(s);
    return rental;
  }

  async getRentals(filter: { stage?: RentalStage; phone?: string; nodeId?: string; limit?: number }, actor: Actor): Promise<Rental[]> {
    const s = await getStore();
    let out = s.rentals;
    const nodeScope = scopeNode(actor) ?? filter.nodeId;
    if (nodeScope) out = out.filter((r) => r.nodeId === nodeScope);
    if (filter.stage) out = out.filter((r) => r.stage === filter.stage);
    if (filter.phone) out = out.filter((r) => r.customer.phone === filter.phone);
    return out.slice(0, filter.limit ?? 100);
  }

  async getRental(idOrCode: string, _actor: Actor): Promise<Rental | undefined> {
    const s = await getStore();
    return s.rentals.find((r) => r.id === idOrCode || r.code === idOrCode);
  }

  async transitionRental(id: string, to: RentalStage, actor: Actor, note?: string): Promise<Rental> {
    const s = await getStore();
    const r = s.rentals.find((x) => x.id === id || x.code === id);
    if (!r) throw new Error(`Rental ${id} not found`);
    assertTransition("Rental", RENTAL_MACHINE, r.stage, to);
    r.timeline.push(event(r.stage, to, actor.userId, note));
    r.stage = to;
    if ((to === "returned" || to === "cancelled") && r.unitId) {
      const unit = s.rentalUnits.find((u) => u.id === r.unitId);
      if (unit) unit.bookings = unit.bookings.filter((b) => b.rentalId !== r.id);
    }
    persist(s);
    return r;
  }

  // ── Admin writes ───────────────────────────────────────────────────────────

  async updateProduct(id: string, patch: Partial<ProductV2>, actor: Actor, opts?: { asSyncEngine?: boolean }): Promise<ProductV2> {
    const s = await getStore();
    const p = s.products.find((x) => x.id === id);
    if (!p) throw new Error(`Product ${id} not found`);
    if (!opts?.asSyncEngine) {
      const rejected = rejectZohoOwnedWrites(patch as Record<string, unknown>);
      if (rejected.length) {
        throw new Error(`Zoho-owned fields are read-only on the website: ${rejected.join(", ")}. Zoho always wins.`);
      }
    }
    Object.assign(p, patch);
    void actor;
    persist(s);
    return p;
  }

  async overrideStock(productId: string, nodeId: string, qty: number, actor: Actor): Promise<StockRecord> {
    const s = await getStore();
    if (qty < 0) throw new Error("Stock cannot be negative");
    let rec = s.stock.find((r) => r.productId === productId && r.nodeId === nodeId);
    if (!rec) {
      rec = { productId, nodeId, qty };
      s.stock.push(rec);
    } else {
      rec.qty = qty;
    }
    // Mark the product's sync record stale — an override diverges from Zoho
    const sync = s.syncRecords.find((x) => x.entityType === "product" && x.entityId === productId);
    if (sync && sync.status === "synced") {
      sync.status = "stale";
      sync.error = `Manual stock override by ${actor.userId} — will be overwritten by next Zoho sync`;
    }
    persist(s);
    return rec;
  }

  async upsertNode(node: Partial<StoreNode> & { id?: string }, _actor: Actor): Promise<StoreNode> {
    const s = await getStore();
    if (node.id) {
      const existing = s.nodes.find((n) => n.id === node.id);
      if (!existing) throw new Error(`Node ${node.id} not found`);
      Object.assign(existing, node);
      persist(s);
      return existing;
    }
    const created: StoreNode = {
      id: `N-${String(s.nodes.length + 1).padStart(3, "0")}`,
      type: "outlet",
      name: "New Node",
      city: "",
      area: "",
      address: "",
      phone: "",
      lat: 0,
      lng: 0,
      territories: [],
      pincodesServed: [],
      stockSource: "own",
      serviceCapable: false,
      rentalCapable: false,
      status: "active",
      ...node,
    };
    s.nodes.push(created);
    persist(s);
    return created;
  }

  // ── Sync health ────────────────────────────────────────────────────────────

  async getSyncRecords(filter?: { status?: SyncRecord["status"] }): Promise<SyncRecord[]> {
    const s = await getStore();
    return filter?.status ? s.syncRecords.filter((r) => r.status === filter.status) : s.syncRecords;
  }

  async retrySync(id: string, actor: Actor): Promise<SyncRecord> {
    const s = await getStore();
    const r = s.syncRecords.find((x) => x.id === id);
    if (!r) throw new Error(`Sync record ${id} not found`);
    r.status = "synced";
    r.error = undefined;
    r.lastRunAt = nowIso();
    void actor;
    persist(s);
    return r;
  }

  // ── Analytics ──────────────────────────────────────────────────────────────

  async getAnalytics(range?: AnalyticsRange): Promise<Analytics> {
    const s = await getStore();
    const fromMs = Date.now() - (range?.fromDays ?? 90) * 86400_000;
    const orders = s.orders.filter((o) => new Date(o.createdAt).getTime() >= fromMs && o.status !== "cancelled");

    const nodeName = (id: string) => s.nodes.find((n) => n.id === id)?.name ?? id;

    const byNode = new Map<string, { revenue: number; orders: number }>();
    const byLine = new Map<string, { revenue: number; orders: number }>();
    const bySource = new Map<string, { revenue: number; orders: number }>();
    for (const o of orders) {
      const src = o.sourceEnquiryId ? "b2b-enquiry" : o.audience === "b2b" ? "b2b-direct" : "website";
      const se = bySource.get(src) ?? { revenue: 0, orders: 0 };
      se.revenue += o.totals.grand;
      se.orders += 1;
      bySource.set(src, se);
      for (const f of o.fulfilments) {
        const share = f.itemIndexes.reduce((sum, i) => sum + (o.items[i]?.qty ?? 0) * (o.items[i]?.unitPrice ?? 0), 0);
        const ne = byNode.get(f.nodeId) ?? { revenue: 0, orders: 0 };
        ne.revenue += share;
        ne.orders += 1;
        byNode.set(f.nodeId, ne);
      }
      for (const it of o.items) {
        const le = byLine.get(it.line) ?? { revenue: 0, orders: 0 };
        le.revenue += it.qty * it.unitPrice;
        le.orders += 1;
        byLine.set(it.line, le);
      }
    }

    const delivered = s.repairJobs.filter((j) => j.stage === "delivered");
    const avgTat = delivered.length
      ? delivered.reduce((sum, j) => {
          const done = j.timeline.find((e) => e.to === "delivered");
          const days = done ? (new Date(done.at).getTime() - new Date(j.createdAt).getTime()) / 86400_000 : j.tatDays;
          return sum + days;
        }, 0) / delivered.length
      : 0;
    const withinTat = delivered.length
      ? delivered.filter((j) => {
          const done = j.timeline.find((e) => e.to === "delivered");
          const days = done ? (new Date(done.at).getTime() - new Date(j.createdAt).getTime()) / 86400_000 : 0;
          return days <= j.tatDays + 0.5;
        }).length / delivered.length
      : 0;

    const fleet = s.rentalUnits.filter((u) => u.status === "in_fleet");
    const booked = fleet.filter((u) => u.bookings.length > 0);

    const soldUnits = s.serialUnits.filter((u) => u.status === "sold").length;

    const distributors = s.nodes.filter((n) => n.type === "distributor");
    const league = distributors
      .map((d) => {
        const e = byNode.get(d.id) ?? { revenue: 0, orders: 0 };
        return {
          nodeId: d.id,
          nodeName: d.name,
          revenue: e.revenue,
          commissionPct: d.commissionPct ?? 0,
          earned: Math.round((e.revenue * (d.commissionPct ?? 0)) / 100),
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    const convertedEnquiries = s.enquiries.filter((e) => e.stage === "order_confirmed").length;

    return {
      revenueByNode: [...byNode.entries()]
        .map(([nodeId, e]) => ({ nodeId, nodeName: nodeName(nodeId), ...e }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 15),
      revenueByLine: [...byLine.entries()].map(([line, e]) => ({ line: line as Analytics["revenueByLine"][0]["line"], ...e })).sort((a, b) => b.revenue - a.revenue),
      revenueBySource: [...bySource.entries()].map(([source, e]) => ({ source, ...e })).sort((a, b) => b.revenue - a.revenue),
      conversion: {
        orders: orders.length,
        enquiries: s.enquiries.length,
        enquiryToOrderPct: s.enquiries.length ? Math.round((convertedEnquiries / s.enquiries.length) * 100) : 0,
      },
      repairTat: { avgDays: Math.round(avgTat * 10) / 10, jobs: delivered.length, withinTatPct: Math.round(withinTat * 100) },
      rentalUtilisation: {
        unitsInFleet: fleet.length,
        unitsBooked: booked.length,
        utilisationPct: fleet.length ? Math.round((booked.length / fleet.length) * 100) : 0,
      },
      refurbSellThrough: {
        unitsTotal: s.serialUnits.length,
        unitsSold: soldUnits,
        sellThroughPct: s.serialUnits.length ? Math.round((soldUnits / s.serialUnits.length) * 100) : 0,
      },
      distributorLeague: league,
      totals: {
        revenue: orders.reduce((sum, o) => sum + o.totals.grand, 0),
        orders: orders.length,
        enquiries: s.enquiries.length,
        repairs: s.repairJobs.length,
        rentals: s.rentals.length,
      },
    };
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  async reset(): Promise<SeedInfo> {
    const store = await resetStore();
    return { seededAt: store.seededAt, counts: storeCounts(store) };
  }

  async getSeedInfo(): Promise<SeedInfo> {
    const store = await getStore();
    return { seededAt: store.seededAt, counts: storeCounts(store) };
  }
}

export type { MockStore };
