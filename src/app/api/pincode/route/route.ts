import { NextRequest } from "next/server";
import { ok, err, handleError } from "@/lib/api-helpers";
import { getProvider } from "@/lib/provider";

export const dynamic = "force-dynamic";

/**
 * Fulfilment plan preview (deck §07): POST { pincode, items:[{productId,qty,serial?}] }
 * → { legs, split, unfulfillable } — pickup vs delivery vs split multi-dispatch.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const pincode = String(body?.pincode ?? "");
    const items = body?.items;
    if (!/^\d{6}$/.test(pincode)) return err(422, "Enter a valid 6-digit pincode");
    if (!Array.isArray(items) || !items.length) return err(422, "items required");
    const plan = await getProvider().routeFulfilment(
      pincode,
      items.map((it: { productId: string; qty?: number; serial?: string }) => ({
        productId: String(it.productId),
        qty: Number(it.qty ?? 1),
        serial: it.serial ? String(it.serial) : undefined,
      })),
    );
    return ok(plan);
  } catch (e) {
    return handleError(e);
  }
}
