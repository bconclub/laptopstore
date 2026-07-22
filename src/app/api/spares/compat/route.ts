import { NextRequest } from "next/server";
import { ok, err, handleError } from "@/lib/api-helpers";
import { getProvider } from "@/lib/provider";

export const dynamic = "force-dynamic";

/**
 * Two-way spares finder (deck §03):
 *   ?model=ThinkPad E14  → parts that fit the model
 *   ?part=P-00312        → models the part fits
 */
export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams;
    const model = q.get("model");
    const part = q.get("part");
    const p = getProvider();
    if (model) {
      const parts = await p.getPartsForModel(model);
      return ok({ mode: "parts-for-model", model, results: parts });
    }
    if (part) {
      const models = await p.getModelsForPart(part);
      return ok({ mode: "models-for-part", part, results: models });
    }
    return err(400, "Pass ?model= or ?part=");
  } catch (e) {
    return handleError(e);
  }
}
