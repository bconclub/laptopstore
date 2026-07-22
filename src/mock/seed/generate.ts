/**
 * Deterministic seed orchestrator. buildSeed() always returns the identical
 * dataset (fixed PRNG seed + fixed time anchor) — the simulation harness and
 * the determinism smoke test depend on this.
 */

import type {
  Enquiry,
  Order,
  PriceTier,
  ProductV2,
  Rental,
  RentalUnit,
  RepairJob,
  RepairService,
  SerialUnit,
  StockRecord,
  StoreNode,
  SyncRecord,
  User,
} from "@/lib/types";
import { buildHistory } from "./history";
import { buildNodes } from "./nodes";
import { buildProducts } from "./products";
import { NOW_ANCHOR, Rng, SEED } from "./rng";

export interface SeedData {
  seededAt: string;
  nodes: StoreNode[];
  products: ProductV2[];
  serialUnits: SerialUnit[];
  rentalUnits: RentalUnit[];
  repairServices: RepairService[];
  stock: StockRecord[];
  priceTiers: PriceTier[];
  users: User[];
  orders: Order[];
  enquiries: Enquiry[];
  repairJobs: RepairJob[];
  rentals: Rental[];
  syncRecords: SyncRecord[];
}

function buildUsers(rng: Rng, nodes: StoreNode[]): User[] {
  const outlets = nodes.filter((n) => n.type === "outlet");
  const distributors = nodes.filter((n) => n.type === "distributor");
  const serviceNode = nodes.find((n) => n.serviceCapable);

  const users: User[] = [
    { id: "U-001", phone: "9500156001", name: "Admin", email: "admin@laptopstoreindia.com", role: "hq_admin", audience: "b2c" },
    { id: "U-002", phone: "9500156002", name: `${outlets[0].area} Manager`, role: "outlet_manager", audience: "b2c", nodeId: outlets[0].id },
    { id: "U-003", phone: "9500156003", name: `${outlets[1].area} Manager`, role: "outlet_manager", audience: "b2c", nodeId: outlets[1].id },
    { id: "U-004", phone: "9500156004", name: `${outlets[2].area} Manager`, role: "outlet_manager", audience: "b2c", nodeId: outlets[2].id },
    { id: "U-005", phone: "9500156005", name: `${distributors[0].city} Distributor`, role: "distributor", audience: "b2b", nodeId: distributors[0].id },
    { id: "U-006", phone: "9500156006", name: `${distributors[1].city} Distributor`, role: "distributor", audience: "b2b", nodeId: distributors[1].id },
    { id: "U-007", phone: "9500156007", name: "Repair Desk", role: "repair_desk", audience: "b2c", nodeId: serviceNode?.id },
    { id: "U-008", phone: "9500156008", name: "B2B Desk", role: "b2b_desk", audience: "b2b" },
  ];

  // B2C customers
  const NAMES = ["Rahul Sharma", "Priya Menon", "Arjun Reddy", "Sneha Iyer", "Vikram Nair", "Ananya Rao", "Karthik Shetty", "Divya Pillai", "Rohan Gupta", "Meera Krishnan"];
  NAMES.forEach((name, i) => {
    users.push({
      id: `U-${String(100 + i).padStart(3, "0")}`,
      phone: `98450000${String(10 + i)}`,
      name,
      role: "customer",
      audience: "b2c",
    });
  });

  // B2B accounts with GSTIN
  const B2B = [
    ["Zoho Corp", "33AAACZ1234C1Z5"], ["Freshworks", "33AAACF5678C1Z2"],
    ["TechM Solutions", "29AAACT9012C1Z8"], ["Verve Media", "27AAACV3456C1Z1"],
    ["Brigade Tech Park", "29AAACB7890C1Z4"],
  ] as const;
  B2B.forEach(([company, gstin], i) => {
    users.push({
      id: `U-${String(200 + i).padStart(3, "0")}`,
      phone: `99400000${String(10 + i)}`,
      name: `${company} Procurement`,
      email: `it@${company.toLowerCase().replace(/[^a-z]/g, "")}.com`,
      role: "customer",
      audience: "b2b",
      companyName: company,
      gstin,
    });
  });
  void rng;
  return users;
}

function buildStock(rng: Rng, products: ProductV2[], nodes: StoreNode[]): StockRecord[] {
  const stock: StockRecord[] = [];
  const stockNodes = nodes.filter((n) => n.type !== "warehouse");
  const warehouse = nodes.find((n) => n.type === "warehouse")!;
  const distributors = nodes.filter((n) => n.type === "distributor");

  for (const p of products) {
    if (p.line === "rental") continue; // rental stock = fleet units, not qty
    const roll = rng.float();
    if (roll < 0.08) continue; // ~8% zero everywhere — "no phantom stock" test
    if (roll < 0.16) {
      // distributor-only items — exercises nearest-source + split routing
      for (const d of rng.pickN(distributors, rng.int(1, 2))) {
        stock.push({ productId: p.id, nodeId: d.id, qty: rng.int(2, 15) });
      }
      continue;
    }
    const spread = rng.pickN(stockNodes, rng.int(3, 8));
    for (const n of spread) {
      stock.push({ productId: p.id, nodeId: n.id, qty: rng.int(1, 12) });
    }
    // warehouse holds backup for ~half
    if (rng.chance(0.5)) stock.push({ productId: p.id, nodeId: warehouse.id, qty: rng.int(5, 25) });
  }
  return stock;
}

function buildPriceTiers(rng: Rng, products: ProductV2[]): PriceTier[] {
  const tiers: PriceTier[] = [];
  const laptops = products.filter((p) => p.line === "new");
  for (const p of rng.pickN(laptops, Math.min(10, laptops.length))) {
    tiers.push(
      { productId: p.id, minQty: 5, unitPrice: Math.round((p.price * 0.95) / 10) * 10 },
      { productId: p.id, minQty: 10, unitPrice: Math.round((p.price * 0.9) / 10) * 10 },
      { productId: p.id, minQty: 25, unitPrice: Math.round((p.price * 0.85) / 10) * 10 },
    );
  }
  return tiers;
}

export function buildSeed(): SeedData {
  const rng = new Rng(SEED);
  const nodes = buildNodes(rng);
  const stockNodeIds = nodes.filter((n) => n.type === "outlet").map((n) => n.id);
  const rentalNodeIds = nodes.filter((n) => n.rentalCapable).map((n) => n.id);
  const { products, serialUnits, rentalUnits, repairServices } = buildProducts(rng, stockNodeIds, rentalNodeIds);
  const users = buildUsers(rng, nodes);
  const stock = buildStock(rng, products, nodes);
  const priceTiers = buildPriceTiers(rng, products);
  const history = buildHistory(rng, products, serialUnits, nodes, users, repairServices);

  return {
    seededAt: NOW_ANCHOR.toISOString(),
    nodes,
    products,
    serialUnits,
    rentalUnits,
    repairServices,
    stock,
    priceTiers,
    users,
    ...history,
  };
}

export function seedCounts(seed: SeedData): Record<string, number> {
  return {
    nodes: seed.nodes.length,
    products: seed.products.length,
    productsNew: seed.products.filter((p) => p.line === "new").length,
    productsRefurb: seed.products.filter((p) => p.line === "refurbished").length,
    productsRental: seed.products.filter((p) => p.line === "rental").length,
    productsSpares: seed.products.filter((p) => p.line === "spares").length,
    productsAccessories: seed.products.filter((p) => p.line === "accessories").length,
    serialUnits: seed.serialUnits.length,
    rentalUnits: seed.rentalUnits.length,
    repairServices: seed.repairServices.length,
    stockRecords: seed.stock.length,
    priceTiers: seed.priceTiers.length,
    users: seed.users.length,
    orders: seed.orders.length,
    enquiries: seed.enquiries.length,
    repairJobs: seed.repairJobs.length,
    rentals: seed.rentals.length,
    syncRecords: seed.syncRecords.length,
  };
}
