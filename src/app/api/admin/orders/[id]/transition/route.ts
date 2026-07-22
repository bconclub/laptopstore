import { NextRequest } from "next/server";
import { ok, err, handleError, actorWithNode } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/auth";
import { getProvider } from "@/lib/provider";
import type { OrderStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

/** POST { to, note? } — illegal transitions return 409 + allowed list. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdmin();
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    if (!body?.to) return err(422, "Pass { to: <status> }");
    const order = await getProvider().transitionOrder(
      id,
      body.to as OrderStatus,
      await actorWithNode(session),
      body.note ? String(body.note) : undefined,
    );
    return ok(order);
  } catch (e) {
    return handleError(e);
  }
}
