import { NextRequest } from "next/server";
import { ok, handleError } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/auth";
import { getProvider } from "@/lib/provider";
import type { LineType } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const q = req.nextUrl.searchParams;
    const p = getProvider();
    const rows = await p.getProducts({
      line: (q.get("line") as LineType) ?? undefined,
      search: q.get("q") ?? undefined,
      brand: q.get("brand") ?? undefined,
      status: (q.get("status") as "active" | "draft" | "archived" | "all") ?? "all",
      limit: Math.min(Number(q.get("limit") ?? 100), 500),
      offset: Number(q.get("offset") ?? 0),
    });
    const withStock = await Promise.all(
      rows.map(async (r) => ({ ...r, totalStock: await p.getTotalStock(r.id) })),
    );
    return ok(withStock);
  } catch (e) {
    return handleError(e);
  }
}
