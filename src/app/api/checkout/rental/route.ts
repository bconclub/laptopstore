import { NextRequest } from "next/server";
import { ok, err, handleError } from "@/lib/api-helpers";
import { getSession } from "@/lib/auth";
import { getProvider } from "@/lib/provider";
import { SYSTEM_ACTOR } from "@/lib/provider/contract";

export const dynamic = "force-dynamic";

/** Rental checkout (deck §07): availability re-check + unit hold; deposit at agreement stage. */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const b = await req.json().catch(() => null);
    if (!b) return err(422, "JSON body required");
    const c = b.customer ?? {};
    if (!c.name || String(c.name).trim().length < 2) return err(422, "Name required");
    if (!/^[6-9]\d{9}$/.test(String(c.phone ?? ""))) return err(422, "Valid 10-digit phone required");
    if (!/^\d{6}$/.test(String(c.pincode ?? ""))) return err(422, "Valid 6-digit pincode required");
    if (!b.productId || !b.from || !b.to) return err(422, "productId, from, to required");
    if (String(b.from) >= String(b.to)) return err(422, "from must be before to");

    const rental = await getProvider().createRental(
      {
        customer: {
          name: String(c.name).trim(),
          phone: String(c.phone),
          pincode: String(c.pincode),
          audience: session?.audience === "b2b" ? "b2b" : "b2c",
        },
        productId: String(b.productId),
        from: String(b.from),
        to: String(b.to),
      },
      session ? { userId: session.userId, role: session.role } : SYSTEM_ACTOR,
    );
    return ok(rental, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
