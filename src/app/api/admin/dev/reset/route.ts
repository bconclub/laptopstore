import { ok, handleError } from "@/lib/api-helpers";
import { requireRole } from "@/lib/auth";
import { getProvider } from "@/lib/provider";

export const dynamic = "force-dynamic";

/** Reseed the mock store to the deterministic baseline. hq_admin only. */
export async function POST() {
  try {
    await requireRole("hq_admin");
    const info = await getProvider().reset();
    return ok(info);
  } catch (e) {
    return handleError(e);
  }
}

export async function GET() {
  try {
    await requireRole("hq_admin");
    const info = await getProvider().getSeedInfo();
    return ok(info);
  } catch (e) {
    return handleError(e);
  }
}
