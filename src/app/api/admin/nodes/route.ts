import { NextRequest } from "next/server";
import { ok, handleError, actorWithNode } from "@/lib/api-helpers";
import { requireAdmin, requireRole } from "@/lib/auth";
import { getProvider } from "@/lib/provider";
import type { StoreNode } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const q = req.nextUrl.searchParams;
    const nodes = await getProvider().getNodes({
      type: (q.get("type") as StoreNode["type"]) ?? undefined,
      city: q.get("city") ?? undefined,
    });
    return ok(nodes);
  } catch (e) {
    return handleError(e);
  }
}

/** Upsert a node (hq only): POST full or partial StoreNode (id present = update). */
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole("hq_admin");
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return ok(undefined);
    const node = await getProvider().upsertNode(body, await actorWithNode(session));
    return ok(node);
  } catch (e) {
    return handleError(e);
  }
}
