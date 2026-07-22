import { NextRequest } from "next/server";
import { ok, err, handleError, actorWithNode } from "@/lib/api-helpers";
import { requireRole } from "@/lib/auth";
import { getProvider } from "@/lib/provider";
import type { SyncRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireRole("hq_admin");
    const status = req.nextUrl.searchParams.get("status");
    const records = await getProvider().getSyncRecords({ status: (status as SyncRecord["status"]) ?? undefined });
    return ok(records);
  } catch (e) {
    return handleError(e);
  }
}

/** POST { id } — retry a failed/stale record (mock flips to synced). */
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole("hq_admin");
    const b = await req.json().catch(() => null);
    if (!b?.id) return err(422, "Pass { id }");
    const rec = await getProvider().retrySync(String(b.id), await actorWithNode(session));
    return ok(rec);
  } catch (e) {
    return handleError(e);
  }
}
