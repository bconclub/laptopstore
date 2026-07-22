import { NextRequest } from "next/server";
import { ok, err, handleError } from "@/lib/api-helpers";
import { requireRole } from "@/lib/auth";
import { getProvider } from "@/lib/provider";

export const dynamic = "force-dynamic";

/** Stock override (intervention): POST { nodeId, qty }. Marks sync stale. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole("hq_admin", "outlet_manager");
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    if (!body?.nodeId || body?.qty == null) return err(422, "Pass { nodeId, qty }");
    const rec = await getProvider().overrideStock(id, String(body.nodeId), Number(body.qty), {
      userId: session.userId,
      role: session.role,
    });
    return ok(rec);
  } catch (e) {
    return handleError(e);
  }
}
