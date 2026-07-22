/**
 * Network seed: 35 own outlets (real branches from locations.ts expanded),
 * 8 distributors, 1 central warehouse. Pincode ranges are real city prefixes
 * so /api/pincode/route demos with plausible inputs.
 */

import { locations } from "@/data/locations";
import type { StoreNode } from "@/lib/types";
import { Rng } from "./rng";

/** Real pincode prefixes per city (first 3 digits). */
const CITY_PIN: Record<string, { prefix: string; lat: number; lng: number }> = {
  Chennai: { prefix: "600", lat: 13.0827, lng: 80.2707 },
  Bangalore: { prefix: "560", lat: 12.9716, lng: 77.5946 },
  Bengaluru: { prefix: "560", lat: 12.9716, lng: 77.5946 },
  Mumbai: { prefix: "400", lat: 19.076, lng: 72.8777 },
  Pune: { prefix: "411", lat: 18.5204, lng: 73.8567 },
  Hyderabad: { prefix: "500", lat: 17.385, lng: 78.4867 },
  Kolkata: { prefix: "700", lat: 22.5726, lng: 88.3639 },
  Coimbatore: { prefix: "641", lat: 11.0168, lng: 76.9558 },
  Vijayawada: { prefix: "520", lat: 16.5062, lng: 80.648 },
};

const DISTRIBUTOR_CITIES = ["Chennai", "Bangalore", "Hyderabad", "Mumbai", "Pune", "Kolkata", "Coimbatore", "Vijayawada"];

function pincodesFor(rng: Rng, city: string, count: number): string[] {
  const meta = CITY_PIN[city] ?? CITY_PIN.Chennai;
  const out = new Set<string>();
  while (out.size < count) out.add(`${meta.prefix}${String(rng.int(1, 99)).padStart(3, "0")}`);
  return [...out].sort();
}

export function buildNodes(rng: Rng): StoreNode[] {
  const nodes: StoreNode[] = [];
  let n = 0;

  // Real branches from the live store locator
  for (const loc of locations) {
    for (const b of loc.branches) {
      n += 1;
      nodes.push({
        id: `N-${String(n).padStart(3, "0")}`,
        type: "outlet",
        name: b.name,
        city: loc.city,
        area: b.area,
        address: b.address,
        phone: b.phone,
        lat: loc.lat + (rng.float() - 0.5) * 0.08,
        lng: loc.lng + (rng.float() - 0.5) * 0.08,
        territories: [`${loc.city} ${b.area}`],
        pincodesServed: pincodesFor(rng, loc.city, rng.int(30, 60)),
        stockSource: "own",
        serviceCapable: rng.chance(0.6),
        rentalCapable: rng.chance(0.3),
        status: "active",
      });
    }
  }

  // Pad generated outlets to reach 35 (deck: 35 stores)
  const padCities = ["Chennai", "Bangalore", "Hyderabad", "Mumbai", "Pune", "Kolkata"];
  const padAreas = ["Central Mall", "Tech Park Rd", "Market Street", "Ring Road", "Metro Plaza", "City Centre"];
  while (nodes.filter((x) => x.type === "outlet").length < 35) {
    n += 1;
    const city = rng.pick(padCities);
    const meta = CITY_PIN[city];
    const area = rng.pick(padAreas);
    nodes.push({
      id: `N-${String(n).padStart(3, "0")}`,
      type: "outlet",
      name: `Laptop Store - ${city} ${area}`,
      city,
      area,
      address: `${rng.int(1, 200)}, ${area}, ${city}`,
      phone: `0${rng.int(7000000000, 9999999999)}`,
      lat: meta.lat + (rng.float() - 0.5) * 0.1,
      lng: meta.lng + (rng.float() - 0.5) * 0.1,
      territories: [`${city} ${area}`],
      pincodesServed: pincodesFor(rng, city, rng.int(30, 60)),
      stockSource: "own",
      serviceCapable: rng.chance(0.6),
      rentalCapable: rng.chance(0.3),
      status: "active",
    });
  }

  // Distributors — extend reach (deck §02: "N Distributors, ingestion model TBD")
  for (const city of DISTRIBUTOR_CITIES) {
    n += 1;
    const meta = CITY_PIN[city];
    nodes.push({
      id: `N-${String(n).padStart(3, "0")}`,
      type: "distributor",
      name: `${city} IT Distribution Co`,
      city,
      area: "Wholesale District",
      address: `Distribution Hub, ${city}`,
      phone: `0${8000000000 + n * 1111}`,
      lat: meta.lat + 0.05,
      lng: meta.lng - 0.05,
      territories: [`${city} Region`],
      pincodesServed: pincodesFor(rng, city, rng.int(60, 90)),
      stockSource: "own",
      commissionPct: rng.int(4, 8),
      serviceCapable: false,
      rentalCapable: rng.chance(0.4),
      status: "active",
    });
  }

  // Central warehouse — Chennai HQ hub, fallback stocking source
  n += 1;
  nodes.push({
    id: `N-${String(n).padStart(3, "0")}`,
    type: "warehouse",
    name: "Central Warehouse - Chennai HQ",
    city: "Chennai",
    area: "Velachery",
    address: "Corporation Park, Velachery, Chennai 600042",
    phone: "09500156666",
    lat: 12.9815,
    lng: 80.2181,
    territories: ["All India"],
    pincodesServed: [], // warehouse ships anywhere as nearest-source fallback
    stockSource: "own",
    serviceCapable: false,
    rentalCapable: true,
    status: "active",
  });

  return nodes;
}
