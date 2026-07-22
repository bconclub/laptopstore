import { NextRequest } from "next/server";
import { ok, err, handleError, actorWithNode } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/auth";
import { getProvider } from "@/lib/provider";
import type { RentalStage } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdmin();
    const { id } = await ctx.params;
    const b = await req.json().catch(() => null);
    if (!b?.to) return err(422, "Pass { to: <stage> }");
    const rental = await getProvider().transitionRental(id, b.to as RentalStage, await actorWithNode(session), b.note);
    return ok(rental);
  } catch (e) {
    return handleError(e);
  }
}
