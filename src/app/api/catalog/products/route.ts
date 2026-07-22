import { NextRequest } from "next/server";
import { ok, handleError } from "@/lib/api-helpers";
import { getProvider } from "@/lib/provider";
import type { ProductFilter } from "@/lib/provider/contract";
import type { LineType } from "@/lib/types";

export const dynamic = "force-dynamic";

const LINES: LineType[] = ["new", "refurbished", "rental", "spares", "accessories"];

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams;
    const line = q.get("line");
    const filter: ProductFilter = {
      line: line && LINES.includes(line as LineType) ? (line as LineType) : undefined,
      category: q.get("category") ?? undefined,
      brand: q.get("brand") ?? undefined,
      priceMin: q.get("priceMin") ? Number(q.get("priceMin")) : undefined,
      priceMax: q.get("priceMax") ? Number(q.get("priceMax")) : undefined,
      processor: q.get("processor") ?? undefined,
      ram: q.get("ram") ?? undefined,
      storage: q.get("storage") ?? undefined,
      gpu: q.get("gpu") ?? undefined,
      screen: q.get("screen") ?? undefined,
      useCase: q.get("useCase") ?? undefined,
      emiOnly: q.get("emi") === "1",
      search: q.get("q") ?? undefined,
      limit: Math.min(Number(q.get("limit") ?? 60), 200),
      offset: Number(q.get("offset") ?? 0),
    };
    const p = getProvider();
    const rows = await p.getProducts(filter);
    // Availability summary per product — "out of stock never shown available"
    const withStock = await Promise.all(
      rows.map(async (r) => ({
        ...r,
        availability:
          r.line === "rental"
            ? { totalStock: (await p.getRentalUnits(r.id)).filter((u) => u.status === "in_fleet").length }
            : r.line === "refurbished"
              ? { totalStock: (await p.getSerialUnits(r.id)).filter((u) => u.status === "available").length }
              : { totalStock: await p.getTotalStock(r.id) },
      })),
    );
    return ok(withStock);
  } catch (e) {
    return handleError(e);
  }
}
