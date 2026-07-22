import { NextRequest } from "next/server";
import { ok, err, handleError, actorWithNode } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/auth";
import { getProvider } from "@/lib/provider";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdmin();
    const { id } = await ctx.params;
    const order = await getProvider().getOrder(id, await actorWithNode(session));
    if (!order) return err(404, `Order ${id} not found`);
    return ok(order);
  } catch (e) {
    return handleError(e);
  }
}
