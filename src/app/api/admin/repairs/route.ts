import { NextRequest } from "next/server";
import { ok, handleError, actorWithNode } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/auth";
import { getProvider } from "@/lib/provider";
import type { RepairStage } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const q = req.nextUrl.searchParams;
    const jobs = await getProvider().getRepairJobs(
      {
        stage: (q.get("stage") as RepairStage) ?? undefined,
        phone: q.get("phone") ?? undefined,
        nodeId: q.get("node") ?? undefined,
        limit: Math.min(Number(q.get("limit") ?? 100), 300),
      },
      await actorWithNode(session),
    );
    return ok(jobs);
  } catch (e) {
    return handleError(e);
  }
}
