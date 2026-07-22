import { NextRequest } from "next/server";
import { ok, err, handleError } from "@/lib/api-helpers";
import { getProvider } from "@/lib/provider";

export const dynamic = "force-dynamic";

/** ?product=P-00123&from=2026-08-01&to=2026-08-15 */
export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams;
    const productId = q.get("product");
    const from = q.get("from");
    const to = q.get("to");
    if (!productId || !from || !to) return err(400, "Pass ?product=&from=&to= (ISO dates)");
    if (from >= to) return err(422, "from must be before to");
    const result = await getProvider().getRentalAvailability(productId, from, to);
    return ok(result);
  } catch (e) {
    return handleError(e);
  }
}
