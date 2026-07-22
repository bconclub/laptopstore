import { NextRequest } from "next/server";
import { ok, err, handleError } from "@/lib/api-helpers";
import { getSession } from "@/lib/auth";
import { getProvider } from "@/lib/provider";
import { SYSTEM_ACTOR } from "@/lib/provider/contract";

export const dynamic = "force-dynamic";

/** Enquiry checkout (deck §07): B2B bulk / exchange — no instant payment, routes to a desk. */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const b = await req.json().catch(() => null);
    if (!b) return err(422, "JSON body required");
    const c = b.contact ?? {};
    if (!c.name || String(c.name).trim().length < 2) return err(422, "Contact name required");
    if (!/^[6-9]\d{9}$/.test(String(c.phone ?? ""))) return err(422, "Valid 10-digit phone required");
    if (!Array.isArray(b.items) || !b.items.length) return err(422, "At least one item required");

    const enquiry = await getProvider().createEnquiry(
      {
        type: ["b2b_bulk", "exchange", "rental_corporate"].includes(b.type) ? b.type : "b2b_bulk",
        contact: {
          name: String(c.name).trim(),
          phone: String(c.phone),
          company: c.company ? String(c.company) : undefined,
          gstin: c.gstin ? String(c.gstin) : undefined,
        },
        items: b.items.map((it: { productId: string; qty?: number }) => ({
          productId: String(it.productId),
          qty: Math.max(1, Number(it.qty ?? 1)),
        })),
      },
      session ? { userId: session.userId, role: session.role } : SYSTEM_ACTOR,
    );
    return ok(enquiry, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
