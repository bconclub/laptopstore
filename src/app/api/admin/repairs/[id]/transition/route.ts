import { NextRequest } from "next/server";
import { ok, err, handleError, actorWithNode } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/auth";
import { getProvider } from "@/lib/provider";
import type { RepairStage } from "@/lib/types";

export const dynamic = "force-dynamic";

/** POST { to, diagnosis?, quoteAmount?, note? } */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdmin();
    const { id } = await ctx.params;
    const b = await req.json().catch(() => null);
    if (!b?.to) return err(422, "Pass { to: <stage> }");
    const job = await getProvider().transitionRepairJob(
      id,
      b.to as RepairStage,
      await actorWithNode(session),
      { diagnosis: b.diagnosis, quoteAmount: b.quoteAmount != null ? Number(b.quoteAmount) : undefined },
      b.note,
    );
    return ok(job);
  } catch (e) {
    return handleError(e);
  }
}
