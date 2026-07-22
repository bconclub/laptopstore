/**
 * Product seed: ~500 ProductV2 rows expanded deterministically from real
 * model families across the real category tree, plus serial units (refurb),
 * rental fleet, spares with a guaranteed two-way compatibility matrix,
 * accessories with cross-sells, and repair services.
 */

import type {
  ProductV2,
  RentalUnit,
  RepairService,
  SerialUnit,
  Spec,
} from "@/lib/types";
import { Rng, isoDate, daysAhead } from "./rng";

// ── Model families (real market models; prices from live-store bands) ────────

interface Family {
  brand: string;
  family: string;
  segment: "everyday" | "business" | "gaming" | "premium";
  basePrice: number; // INR entry config
  category: string; // leaf slug in the category tree
}

const NEW_FAMILIES: Family[] = [
  { brand: "Dell", family: "Inspiron 15", segment: "everyday", basePrice: 45990, category: "dell-inspiron" },
  { brand: "Dell", family: "Vostro 14", segment: "business", basePrice: 42990, category: "dell-vostro" },
  { brand: "Dell", family: "Latitude 5440", segment: "business", basePrice: 78990, category: "dell-latitude" },
  { brand: "Dell", family: "XPS 13", segment: "premium", basePrice: 112990, category: "dell-xps" },
  { brand: "Dell", family: "G15 Gaming", segment: "gaming", basePrice: 82990, category: "dell-gaming" },
  { brand: "HP", family: "Pavilion 15", segment: "everyday", basePrice: 52990, category: "hp-pavilion" },
  { brand: "HP", family: "ProBook 440", segment: "business", basePrice: 61990, category: "hp-probook" },
  { brand: "HP", family: "EliteBook 840", segment: "business", basePrice: 94990, category: "hp-elitebook" },
  { brand: "HP", family: "Victus 16", segment: "gaming", basePrice: 71990, category: "hp-gaming" },
  { brand: "HP", family: "Spectre x360", segment: "premium", basePrice: 129990, category: "hp-spectre" },
  { brand: "Lenovo", family: "IdeaPad Slim 5", segment: "everyday", basePrice: 55990, category: "lenovo-ideapad" },
  { brand: "Lenovo", family: "ThinkPad E14", segment: "business", basePrice: 67990, category: "lenovo-thinkpad" },
  { brand: "Lenovo", family: "Yoga Slim 7", segment: "premium", basePrice: 89990, category: "lenovo-yoga" },
  { brand: "Lenovo", family: "Legion 5", segment: "gaming", basePrice: 91990, category: "lenovo-legion" },
  { brand: "Asus", family: "Vivobook 16", segment: "everyday", basePrice: 47990, category: "asus-vivobook" },
  { brand: "Asus", family: "Zenbook 14", segment: "premium", basePrice: 84990, category: "asus-zenbook" },
  { brand: "Asus", family: "TUF Gaming A15", segment: "gaming", basePrice: 77990, category: "asus-tuf" },
  { brand: "Asus", family: "ROG Zephyrus G14", segment: "gaming", basePrice: 134990, category: "asus-rog" },
  { brand: "Acer", family: "Aspire 7", segment: "everyday", basePrice: 54990, category: "acer-aspire" },
  { brand: "Acer", family: "Nitro V", segment: "gaming", basePrice: 67990, category: "acer-nitro" },
  { brand: "Apple", family: "MacBook Air M2", segment: "premium", basePrice: 91990, category: "apple-macbook-air" },
  { brand: "Apple", family: "MacBook Air M3", segment: "premium", basePrice: 109990, category: "apple-macbook-air" },
  { brand: "Apple", family: "MacBook Pro 14", segment: "premium", basePrice: 168990, category: "apple-macbook-pro" },
];

const PROCESSORS: Record<Family["segment"], string[]> = {
  everyday: ["Intel Core i3-1315U", "Intel Core i5-1334U", "AMD Ryzen 5 7530U"],
  business: ["Intel Core i5-1335U", "Intel Core i7-1355U", "AMD Ryzen 7 PRO 7730U"],
  gaming: ["Intel Core i5-13450HX", "Intel Core i7-13650HX", "AMD Ryzen 7 7735HS", "AMD Ryzen 9 7940HS"],
  premium: ["Intel Core Ultra 5 125H", "Intel Core Ultra 7 155H", "Apple M2", "Apple M3"],
};

const GPUS = ["RTX 3050 6GB", "RTX 4050 6GB", "RTX 4060 8GB", "RTX 4070 8GB"];
const RAMS = ["8 GB", "16 GB", "32 GB"];
const STORAGES = ["512 GB SSD", "1 TB SSD"];
const SCREENS = ["14″ FHD IPS", "15.6″ FHD 120Hz", "16″ WUXGA IPS", "13.6″ Retina"];
const USE_CASE: Record<Family["segment"], string[]> = {
  everyday: ["student", "home"],
  business: ["work", "business"],
  gaming: ["gaming", "creator"],
  premium: ["work", "creator"],
};

// Real product images from public/products reused as placeholder art per brand
const BRAND_IMG: Record<string, string> = {
  Dell: "/products/dell-inspiron-15-3530.jpg",
  HP: "/products/hp-15-fd0021tu.jpg",
  Lenovo: "/products/lenovo-ideapad-slim-3.jpg",
  Asus: "/products/asus-vivobook-15-x1502.jpg",
  Acer: "/products/lenovo-ideapad-slim-3.jpg",
  Apple: "/products/macbook-air-m2-13.jpg",
};
const REFURB_IMG: Record<string, string> = {
  Dell: "/products/dell-latitude-3380-refurbished.jpg",
  HP: "/products/hp-elitebook-840-g5-refurbished.jpg",
  Lenovo: "/products/lenovo-thinkpad-t460-refurbished.jpg",
  Asus: "/products/asus-vivobook-15-x1502.jpg",
  Acer: "/products/dell-latitude-e6420-refurbished.jpg",
  Apple: "/products/macbook-air-m2-13.jpg",
};

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function mkSpecs(proc: string, ram: string, storage: string, screen: string, gpu?: string): Spec[] {
  const specs: Spec[] = [
    { label: "Processor", value: proc },
    { label: "Memory", value: ram },
    { label: "Storage", value: storage },
    { label: "Display", value: screen },
  ];
  if (gpu) specs.push({ label: "Graphics", value: gpu });
  specs.push({ label: "Operating System", value: proc.startsWith("Apple") ? "macOS" : "Windows 11 Home (genuine)" });
  return specs;
}

export interface ProductSeed {
  products: ProductV2[];
  serialUnits: SerialUnit[];
  rentalUnits: RentalUnit[];
  repairServices: RepairService[];
  /** All generated laptop model display names — the spares compat universe */
  modelNames: string[];
}

export function buildProducts(rng: Rng, nodeIds: string[], rentalNodeIds: string[]): ProductSeed {
  const products: ProductV2[] = [];
  const serialUnits: SerialUnit[] = [];
  const rentalUnits: RentalUnit[] = [];
  const modelNames: string[] = [];
  let pid = 0;
  const nextId = () => `P-${String(++pid).padStart(5, "0")}`;

  // ── NEW: ~200 (23 families × 2 generations × 3-5 variant configs) ──────────
  for (const fam of NEW_FAMILIES) {
    for (const gen of ["", "2024"] as const) {
    const variants = rng.int(3, 5);
    const groupId = `VG-${slugify(fam.family)}${gen ? `-${gen}` : ""}`;
    for (let v = 0; v < variants; v++) {
      const proc = PROCESSORS[fam.segment][v % PROCESSORS[fam.segment].length];
      const ram = RAMS[Math.min(v + (fam.segment === "gaming" || fam.segment === "premium" ? 1 : 0), RAMS.length - 1)];
      const storage = STORAGES[v % STORAGES.length];
      const gpu = fam.segment === "gaming" ? GPUS[v % GPUS.length] : undefined;
      const screen = fam.brand === "Apple" ? "13.6″ Retina" : SCREENS[v % 3];
      const genBump = gen ? 1.08 : 1;
      const price = Math.round((fam.basePrice * genBump * (1 + v * 0.18)) / 10) * 10;
      const id = nextId();
      const famName = gen ? `${fam.family} (${gen})` : fam.family;
      const display = `${fam.brand} ${famName} (${proc.split(" ").slice(-1)[0]}, ${ram}, ${storage.split(" ")[0]}${storage.split(" ")[1]})`;
      modelNames.push(`${fam.brand} ${fam.family}`);
      const genTag = gen ? `-${gen}` : "";
      products.push({
        id,
        zohoRecordId: `zoho_itm_${88210000 + pid}`,
        sku: `${fam.brand.slice(0, 3).toUpperCase()}-${slugify(fam.family).toUpperCase().replace(/-/g, "")}${genTag}-V${v + 1}`,
        slug: slugify(`${fam.brand}-${fam.family}${genTag}-${proc.split(" ").pop()}-${ram}-v${v + 1}`),
        line: "new",
        status: "active",
        titles: {
          ops: `${fam.brand.toUpperCase()}-${slugify(fam.family).toUpperCase()}${genTag.toUpperCase()}-V${v + 1}`,
          display,
          seo: `${fam.brand} ${famName} ${proc.split(" ").pop()} Price in India | Laptop Store`,
        },
        brand: fam.brand,
        category: "laptops",
        price,
        mrp: Math.round((price * rng.int(108, 122)) / 1000) * 10,
        images: [BRAND_IMG[fam.brand]],
        highlights: [
          `${proc} performance for ${USE_CASE[fam.segment][0]} workloads`,
          `${ram} RAM + ${storage}`,
          gpu ? `${gpu} dedicated graphics` : `${screen} display`,
          "GST invoice + brand India warranty",
        ],
        specs: mkSpecs(proc, ram, storage, screen, gpu),
        warranty: "1-year brand onsite warranty",
        rating: rng.int(40, 49) / 10,
        reviewCount: rng.int(8, 220),
        badge: v === 0 && rng.chance(0.3) ? "Bestseller" : undefined,
        dataGaps: rng.chance(0.08) ? ["missing-image"] : [],
        lineData: {
          kind: "new",
          attrs: {
            processor: proc,
            ram,
            storage,
            gpu,
            screen,
            useCase: USE_CASE[fam.segment],
          },
          variantGroupId: groupId,
          emiEligible: price > 30000,
        },
      });
    }
    }
  }

  // ── REFURBISHED: ~60 products → ~180 serial units ──────────────────────────
  const REFURB_MODELS = [
    ["Dell", "Latitude 3380", 20990, 52000], ["Dell", "Latitude 7490", 28990, 89000],
    ["Dell", "Latitude E6420", 14990, 45000], ["Dell", "Precision 5530", 45990, 145000],
    ["HP", "EliteBook 840 G5", 35388, 92000], ["HP", "EliteBook 830 G6", 32990, 88000],
    ["HP", "ProBook 640 G4", 24990, 68000], ["HP", "ZBook 15 G5", 48990, 155000],
    ["Lenovo", "ThinkPad T460", 31848, 78000], ["Lenovo", "ThinkPad T480", 33990, 85000],
    ["Lenovo", "ThinkPad X1 Carbon G6", 42990, 128000], ["Lenovo", "ThinkPad L480", 25990, 65000],
    ["Apple", "MacBook Air 2019", 38990, 92000], ["Apple", "MacBook Pro 2019", 55990, 135000],
    ["Asus", "ExpertBook B1", 27990, 55000],
  ] as const;
  const SOURCES = ["corporate buyback", "exchange program", "leasing return", "distributor"];
  for (const [brand, model, price, newPrice] of REFURB_MODELS) {
    for (let cfg = 0; cfg < rng.int(3, 4); cfg++) {
      const ram = RAMS[cfg % 2];
      const id = nextId();
      const p = Math.round((price * (1 + cfg * 0.12)) / 10) * 10;
      const display = `${brand} ${model} Refurbished (${ram}, ${STORAGES[cfg % 2]})`;
      modelNames.push(`${brand} ${model}`);
      products.push({
        id,
        zohoRecordId: `zoho_itm_${88210000 + pid}`,
        sku: `REF-${brand.slice(0, 3).toUpperCase()}-${slugify(model).toUpperCase().replace(/-/g, "")}-C${cfg + 1}`,
        slug: slugify(`${brand}-${model}-refurbished-${ram}-${cfg}`),
        line: "refurbished",
        status: "active",
        titles: {
          ops: `REF-${brand.toUpperCase()}-${slugify(model).toUpperCase()}-C${cfg + 1}`,
          display,
          seo: `Refurbished ${brand} ${model} ${ram} Price | Laptop Store India`,
        },
        brand,
        // Category tree has brand-specific refurb leaves for dell/hp/lenovo/apple only
        category: ["Dell", "HP", "Lenovo", "Apple"].includes(brand)
          ? `refurbished-${brand.toLowerCase()}`
          : "refurbished-laptops",
        price: p,
        mrp: newPrice,
        images: [REFURB_IMG[brand]],
        highlights: [
          "Certified refurbished, 40-point inspection",
          `${ram} RAM + ${STORAGES[cfg % 2]}`,
          "Fresh Windows 11 Pro install",
          "6-month warranty, extendable to 1 year",
        ],
        specs: mkSpecs(PROCESSORS.business[cfg % 3], ram, STORAGES[cfg % 2], "14″ FHD anti-glare"),
        warranty: "6-month carry-in warranty, extendable",
        rating: rng.int(42, 48) / 10,
        reviewCount: rng.int(15, 140),
        badge: rng.chance(0.2) ? "Top rated" : undefined,
        dataGaps: rng.chance(0.1) ? ["missing-serial-photos"] : [],
        lineData: {
          kind: "refurbished",
          savingsPct: Math.round(((newPrice - p) / newPrice) * 100),
        },
      });
      // Serial units for this config
      const unitCount = rng.int(2, 5);
      for (let u = 0; u < unitCount; u++) {
        const sold = rng.chance(0.15);
        serialUnits.push({
          serial: `LS${brand.slice(0, 2).toUpperCase()}${String(100000 + pid * 10 + u)}`,
          productId: id,
          grade: rng.chance(0.55) ? "A" : rng.chance(0.7) ? "B" : "C",
          batteryHealthPct: rng.int(78, 98),
          warrantyMonths: rng.pick([6, 6, 12]),
          ageMonths: rng.int(24, 72),
          source: rng.pick(SOURCES),
          photos: [REFURB_IMG[brand]],
          nodeId: rng.pick(nodeIds),
          status: sold ? "sold" : "available",
        });
      }
    }
  }

  // ── RENTALS: ~30 products → ~80 fleet units ────────────────────────────────
  const RENTAL_MODELS = [
    ["Dell", "Latitude 3420", 350], ["Dell", "Latitude 5420", 450], ["HP", "ProBook 450", 400],
    ["HP", "EliteBook 840", 550], ["Lenovo", "ThinkPad L14", 380], ["Lenovo", "ThinkPad T14", 500],
    ["Asus", "ExpertBook B1", 320], ["Apple", "MacBook Air M1", 700], ["Dell", "Precision 3571", 900],
    ["HP", "ZBook Firefly", 850],
  ] as const;
  for (const [brand, model, perDayBase] of RENTAL_MODELS) {
    for (let cfg = 0; cfg < 3; cfg++) {
      const id = nextId();
      const perDay = Math.round(perDayBase * (1 + cfg * 0.25));
      const display = `${brand} ${model} Rental (${RAMS[cfg % 2]}, ${STORAGES[cfg % 2]})`;
      modelNames.push(`${brand} ${model}`);
      const buyPrice = perDay * 100;
      products.push({
        id,
        zohoRecordId: `zoho_itm_${88210000 + pid}`,
        sku: `RNT-${brand.slice(0, 3).toUpperCase()}-${slugify(model).toUpperCase().replace(/-/g, "")}-C${cfg + 1}`,
        slug: slugify(`${brand}-${model}-rental-${cfg}`),
        line: "rental",
        status: "active",
        titles: {
          ops: `RNT-${brand.toUpperCase()}-${slugify(model).toUpperCase()}-C${cfg + 1}`,
          display,
          seo: `Rent ${brand} ${model} in Chennai, Bangalore | Laptop Store Rentals`,
        },
        brand,
        category: "laptops",
        price: buyPrice, // reference value for deposit math
        images: [BRAND_IMG[brand] ?? BRAND_IMG.Dell],
        highlights: [
          "Corporate + individual rentals",
          "Sanitised, imaged, delivery ready",
          "Swap support within 24h on failure",
          "Volume pricing for 10+ units",
        ],
        specs: mkSpecs(PROCESSORS.business[cfg % 3], RAMS[cfg % 2], STORAGES[cfg % 2], "14″ FHD"),
        warranty: "Covered by rental agreement",
        dataGaps: [],
        lineData: {
          kind: "rental",
          pricingTiers: [
            { minDays: 1, perDay },
            { minDays: 7, perDay: Math.round(perDay * 0.72) },
            { minDays: 30, perDay: Math.round(perDay * 0.5) },
          ],
          deposit: Math.round((buyPrice * 0.2) / 100) * 100,
          audienceAllowed: ["b2c", "b2b"],
        },
      });
      // Fleet units at rental-capable nodes
      for (let u = 0; u < rng.int(2, 3); u++) {
        const unitId = `RU-${String(rentalUnits.length + 1).padStart(4, "0")}`;
        const bookings = rng.chance(0.3)
          ? [{
              from: isoDate(daysAhead(rng.int(1, 5))),
              to: isoDate(daysAhead(rng.int(8, 20))),
              rentalId: "SEED-HELD",
            }]
          : [];
        rentalUnits.push({
          id: unitId,
          serial: `RNT${String(200000 + rentalUnits.length)}`,
          productId: id,
          nodeId: rng.pick(rentalNodeIds),
          status: "in_fleet",
          bookings,
        });
      }
    }
  }

  // ── SPARES: ~150 with two-way compat matrix over generated model names ─────
  const PART_TYPES = [
    ["Battery", "battery", 2490, 5990], ["Keyboard", "keyboard", 1490, 3990],
    ["Screen Panel", "screen", 3990, 12990], ["Charger Adapter", "adapter", 1190, 3490],
    ["Cooling Fan", "fan", 890, 2490], ["Hinge Set", "hinge", 690, 1990],
    ["RAM Module 8GB", "ram", 1890, 3290], ["SSD 512GB", "ssd", 2790, 4590],
    ["Motherboard", "motherboard", 8990, 24990], ["Trackpad", "trackpad", 1290, 3490],
  ] as const;
  const uniqueModels = [...new Set(modelNames)];
  for (const brand of ["Dell", "HP", "Lenovo", "Asus", "Acer"]) {
    const brandModels = uniqueModels.filter((m) => m.startsWith(brand));
    if (!brandModels.length) continue;
    for (const [partName, partSlug, lo, hi] of PART_TYPES) {
      for (let v = 0; v < 3; v++) {
        const id = nextId();
        const compat = rng.pickN(brandModels, Math.min(rng.int(3, 8), brandModels.length));
        const oem = rng.chance(0.4);
        const price = rng.int(lo, hi);
        const display = `${brand} ${partName} ${oem ? "(OEM Original)" : "(Compatible)"} — fits ${compat[0]}${compat.length > 1 ? ` +${compat.length - 1} models` : ""}`;
        products.push({
          id,
          zohoRecordId: `zoho_itm_${88210000 + pid}`,
          sku: `SPR-${brand.slice(0, 3).toUpperCase()}-${partSlug.toUpperCase()}-${v + 1}`,
          slug: slugify(`${brand}-${partSlug}-${oem ? "oem" : "compatible"}-${v}`),
          line: "spares",
          status: "active",
          titles: {
            ops: `SPR-${brand.toUpperCase()}-${partSlug.toUpperCase()}-${v + 1}`,
            display,
            seo: `${brand} ${partName} Price in India | 2600+ Laptop Spares`,
          },
          brand,
          category: "laptop-spares",
          price,
          images: [brand === "Dell" ? "/products/dell-latitude-battery-original.jpg" : brand === "HP" ? "/products/hp-laptop-keyboard-replacement.jpg" : "/products/lenovo-thinkpad-screen-14-fhd.jpg"],
          highlights: [
            oem ? "OEM original part" : "Grade-A compatible part",
            `Fits ${compat.length} ${brand} models`,
            "Fitting service available at all service centres",
            "Tested before dispatch",
          ],
          specs: [
            { label: "Part Number", value: `${brand.slice(0, 2).toUpperCase()}-${partSlug.toUpperCase()}-${1000 + pid}` },
            { label: "Type", value: oem ? "OEM Original" : "Compatible" },
            { label: "Warranty", value: oem ? "6 months" : "3 months" },
          ],
          warranty: oem ? "6-month replacement warranty" : "3-month replacement warranty",
          dataGaps: rng.chance(0.12) ? ["missing-compat-verify"] : [],
          lineData: {
            kind: "spares",
            partNumber: `${brand.slice(0, 2).toUpperCase()}-${partSlug.toUpperCase()}-${1000 + pid}`,
            oemType: oem ? "oem" : "compatible",
            compatibleModels: compat,
          },
        });
      }
    }
  }

  // ── ACCESSORIES: ~60 cross-sold ────────────────────────────────────────────
  const ACC = [
    ["Laptop Backpack Pro", 1990, "accessories"], ["Wireless Mouse", 890, "accessories"],
    ["Mechanical Keyboard", 3490, "accessories"], ["USB-C Hub 7-in-1", 2290, "accessories"],
    ["Laptop Stand Aluminium", 1490, "accessories"], ["Noise-Cancel Headset", 4990, "accessories"],
    ["Webcam 1080p", 2490, "accessories"], ["External SSD 1TB", 6990, "accessories"],
    ["Cooling Pad RGB", 1290, "accessories"], ["Privacy Screen 15.6", 1890, "accessories"],
  ] as const;
  const laptopSlugs = products.filter((p) => p.line === "new").map((p) => p.slug);
  for (const [name, price, cat] of ACC) {
    for (const brandTag of ["Universal", "Pro", "Essential", "Travel", "Gaming", "Office"]) {
      const id = nextId();
      const display = `${name} ${brandTag}`;
      products.push({
        id,
        zohoRecordId: `zoho_itm_${88210000 + pid}`,
        sku: `ACC-${slugify(name).toUpperCase().replace(/-/g, "").slice(0, 10)}-${brandTag.slice(0, 3).toUpperCase()}`,
        slug: slugify(`${name}-${brandTag}`),
        line: "accessories",
        status: "active",
        titles: {
          ops: `ACC-${slugify(name).toUpperCase()}-${brandTag.toUpperCase()}`,
          display,
          seo: `${display} | Laptop Store Accessories`,
        },
        brand: brandTag,
        category: cat,
        price: Math.round((price * (brandTag === "Pro" || brandTag === "Gaming" ? 1.4 : 1)) / 10) * 10,
        images: ["/products/hp-laserjet-1020-plus.jpg"],
        highlights: ["Cross-compatible with all laptop brands", "1-year warranty", "Same-day pickup at 35 stores"],
        specs: [{ label: "Compatibility", value: "Universal" }],
        warranty: "1-year replacement warranty",
        dataGaps: [],
        lineData: {
          kind: "accessories",
          crossSellSlugs: rng.pickN(laptopSlugs, 4),
        },
      });
    }
  }

  // ── REPAIR SERVICES: 12 ────────────────────────────────────────────────────
  const repairServices: RepairService[] = [
    { id: "RS-01", name: "Screen Replacement", serviceTypes: ["screen"], brands: ["Dell", "HP", "Lenovo", "Asus", "Acer", "Apple"], baseTatDays: 1 },
    { id: "RS-02", name: "Battery Replacement", serviceTypes: ["battery"], brands: ["Dell", "HP", "Lenovo", "Asus", "Acer", "Apple"], baseTatDays: 1 },
    { id: "RS-03", name: "Keyboard Replacement", serviceTypes: ["keyboard"], brands: ["Dell", "HP", "Lenovo", "Asus", "Acer"], baseTatDays: 1 },
    { id: "RS-04", name: "Motherboard Repair (Chip-level)", serviceTypes: ["motherboard"], brands: ["Dell", "HP", "Lenovo", "Asus", "Acer"], baseTatDays: 5, advanceAmount: 500 },
    { id: "RS-05", name: "Liquid Damage Treatment", serviceTypes: ["liquid"], brands: ["Dell", "HP", "Lenovo", "Asus", "Acer", "Apple"], baseTatDays: 4, advanceAmount: 500 },
    { id: "RS-06", name: "Hinge & Body Repair", serviceTypes: ["hinge"], brands: ["Dell", "HP", "Lenovo", "Asus", "Acer"], baseTatDays: 2 },
    { id: "RS-07", name: "RAM / SSD Upgrade", serviceTypes: ["upgrade"], brands: ["Dell", "HP", "Lenovo", "Asus", "Acer", "Apple"], baseTatDays: 1 },
    { id: "RS-08", name: "OS Install & Data Recovery", serviceTypes: ["software"], brands: ["Dell", "HP", "Lenovo", "Asus", "Acer", "Apple"], baseTatDays: 1 },
    { id: "RS-09", name: "Fan / Thermal Service", serviceTypes: ["thermal"], brands: ["Dell", "HP", "Lenovo", "Asus", "Acer"], baseTatDays: 1 },
    { id: "RS-10", name: "MacBook Logic Board Repair", serviceTypes: ["motherboard"], brands: ["Apple"], baseTatDays: 6, advanceAmount: 1000 },
    { id: "RS-11", name: "Not Powering On Diagnosis", serviceTypes: ["diagnosis"], brands: ["Dell", "HP", "Lenovo", "Asus", "Acer", "Apple"], baseTatDays: 2 },
    { id: "RS-12", name: "Annual Maintenance (AMC)", serviceTypes: ["amc"], brands: ["Dell", "HP", "Lenovo", "Asus", "Acer", "Apple"], baseTatDays: 1 },
  ];

  return { products, serialUnits, rentalUnits, repairServices, modelNames: uniqueModels };
}
