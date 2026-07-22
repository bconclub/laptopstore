import { ok, handleError } from "@/lib/api-helpers";
import { requireSession } from "@/lib/auth";
import { getProvider } from "@/lib/provider";

export const dynamic = "force-dynamic";

/** Account-lite: everything tied to the session's phone (orders/repairs/rentals). */
export async function GET() {
  try {
    const session = await requireSession();
    const phone = session.phone ?? "";
    const p = getProvider();
    const actor = { userId: session.userId, role: session.role };
    const [orders, repairs, rentals] = await Promise.all([
      p.getOrders({ phone, limit: 50 }, actor),
      p.getRepairJobs({ phone, limit: 50 }, actor),
      p.getRentals({ phone, limit: 50 }, actor),
    ]);
    return ok({ orders, repairs, rentals });
  } catch (e) {
    return handleError(e);
  }
}
