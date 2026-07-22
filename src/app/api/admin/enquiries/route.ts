import { NextRequest } from "next/server";
import { ok, handleError, actorWithNode } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/auth";
import { getProvider } from "@/lib/provider";
import type { Enquiry, EnquiryStage } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const q = req.nextUrl.searchParams;
    const enquiries = await getProvider().getEnquiries(
      {
        stage: (q.get("stage") as EnquiryStage) ?? undefined,
        type: (q.get("type") as Enquiry["type"]) ?? undefined,
        limit: Math.min(Number(q.get("limit") ?? 100), 300),
      },
      await actorWithNode(session),
    );
    return ok(enquiries);
  } catch (e) {
    return handleError(e);
  }
}
