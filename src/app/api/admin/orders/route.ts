import { NextRequest } from "next/server";
import { ok, handleError, actorWithNode } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/auth";
import { getProvider } from "@/lib/provider";
import type { Audience, OrderStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const q = req.nextUrl.searchParams;
    const orders = await getProvider().getOrders(
      {
        status: (q.get("status") as OrderStatus) ?? undefined,
        phone: q.get("phone") ?? undefined,
        nodeId: q.get("node") ?? undefined,
        audience: (q.get("audience") as Audience) ?? undefined,
        limit: Math.min(Number(q.get("limit") ?? 100), 300),
      },
      await actorWithNode(session),
    );
    return ok(orders);
  } catch (e) {
    return handleError(e);
  }
}
