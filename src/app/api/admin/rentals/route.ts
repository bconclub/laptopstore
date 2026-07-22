import { NextRequest } from "next/server";
import { ok, handleError, actorWithNode } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/auth";
import { getProvider } from "@/lib/provider";
import type { RentalStage } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const q = req.nextUrl.searchParams;
    const rentals = await getProvider().getRentals(
      {
        stage: (q.get("stage") as RentalStage) ?? undefined,
        phone: q.get("phone") ?? undefined,
        nodeId: q.get("node") ?? undefined,
        limit: Math.min(Number(q.get("limit") ?? 100), 300),
      },
      await actorWithNode(session),
    );
    return ok(rentals);
  } catch (e) {
    return handleError(e);
  }
}
