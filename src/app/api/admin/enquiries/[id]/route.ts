import { NextRequest } from "next/server";
import { ok, err, handleError, actorWithNode } from "@/lib/api-helpers";
import { requireAdmin, requireRole } from "@/lib/auth";
import { getProvider } from "@/lib/provider";
import type { EnquiryStage } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdmin();
    const { id } = await ctx.params;
    const enquiry = await getProvider().getEnquiry(id, await actorWithNode(session));
    if (!enquiry) return err(404, `Enquiry ${id} not found`);
    return ok(enquiry);
  } catch (e) {
    return handleError(e);
  }
}

/**
 * POST — pipeline actions on one enquiry:
 *   { action: "transition", to, note? }
 *   { action: "quote", unitPrice, qty, validDays?, terms? }
 *   { action: "assign", userId }
 *   { action: "convert" }  → creates the Net-30 order from the last quote
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole("hq_admin", "b2b_desk");
    const { id } = await ctx.params;
    const b = await req.json().catch(() => null);
    const p = getProvider();
    const actor = await actorWithNode(session);
    switch (b?.action) {
      case "transition":
        return ok(await p.transitionEnquiry(id, b.to as EnquiryStage, actor, b.note));
      case "quote":
        return ok(await p.addQuote(id, {
          unitPrice: Number(b.unitPrice),
          qty: Number(b.qty),
          validDays: Number(b.validDays ?? 15),
          terms: String(b.terms ?? "Net-30, delivery included"),
        }, actor));
      case "assign":
        return ok(await p.assignEnquiry(id, String(b.userId), actor));
      case "convert":
        return ok(await p.convertEnquiryToOrder(id, actor));
      default:
        return err(422, "action must be transition | quote | assign | convert");
    }
  } catch (e) {
    return handleError(e);
  }
}
