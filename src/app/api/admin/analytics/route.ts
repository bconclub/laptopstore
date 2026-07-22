import { NextRequest } from "next/server";
import { ok, handleError } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/auth";
import { getProvider } from "@/lib/provider";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const days = Number(req.nextUrl.searchParams.get("days") ?? 90);
    const analytics = await getProvider().getAnalytics({ fromDays: days });
    return ok(analytics);
  } catch (e) {
    return handleError(e);
  }
}
