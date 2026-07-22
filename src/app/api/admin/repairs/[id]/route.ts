import { NextRequest } from "next/server";
import { ok, err, handleError, actorWithNode } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/auth";
import { getProvider } from "@/lib/provider";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdmin();
    const { id } = await ctx.params;
    const job = await getProvider().getRepairJob(id, await actorWithNode(session));
    if (!job) return err(404, `Repair job ${id} not found`);
    return ok(job);
  } catch (e) {
    return handleError(e);
  }
}
