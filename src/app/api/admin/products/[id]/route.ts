import { NextRequest } from "next/server";
import { ok, err, handleError } from "@/lib/api-helpers";
import { requireAdmin, requireRole } from "@/lib/auth";
import { getProvider } from "@/lib/provider";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const p = getProvider();
    const product = await p.getProductById(id);
    if (!product) return err(404, `Product ${id} not found`);
    const [nodeStock, serialUnits, rentalUnits, priceTiers, sync] = await Promise.all([
      p.getNodeStock(product.id),
      p.getSerialUnits(product.id),
      p.getRentalUnits(product.id),
      p.getPriceTiers(product.id),
      p.getSyncRecords().then((rs) => rs.find((r) => r.entityId === product.id)),
    ]);
    return ok({ product, nodeStock, serialUnits, rentalUnits, priceTiers, sync });
  } catch (e) {
    return handleError(e);
  }
}

/** PATCH website-owned fields only; Zoho-owned writes are rejected by the provider. */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole("hq_admin", "outlet_manager");
    const { id } = await ctx.params;
    const patch = await req.json().catch(() => null);
    if (!patch || typeof patch !== "object") return err(422, "JSON patch body required");
    const updated = await getProvider().updateProduct(id, patch, { userId: session.userId, role: session.role });
    return ok(updated);
  } catch (e) {
    return handleError(e);
  }
}
