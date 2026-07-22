import { NextRequest } from "next/server";
import { ok, err, handleError } from "@/lib/api-helpers";
import { getSession } from "@/lib/auth";
import { getProvider } from "@/lib/provider";
import { SYSTEM_ACTOR } from "@/lib/provider/contract";
import type { PaymentMethod } from "@/lib/types";

export const dynamic = "force-dynamic";

const METHODS: PaymentMethod[] = ["upi", "card", "emi", "cod", "net30"];

/**
 * Purchase checkout (deck §07): validates stock/serials, resolves audience
 * pricing (B2B tiers from session), routes fulfilment (split allowed),
 * applies trade-in credit, creates the Order at `confirmed`.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const body = await req.json().catch(() => null);
    if (!body) return err(422, "JSON body required");

    const customer = body.customer ?? {};
    if (!customer.name || String(customer.name).trim().length < 2) return err(422, "Name required");
    if (!/^[6-9]\d{9}$/.test(String(customer.phone ?? ""))) return err(422, "Valid 10-digit phone required");
    if (!/^\d{6}$/.test(String(customer.pincode ?? ""))) return err(422, "Valid 6-digit pincode required");
    if (!Array.isArray(body.items) || !body.items.length) return err(422, "Cart is empty");

    const method = METHODS.includes(body.payment?.method) ? (body.payment.method as PaymentMethod) : "upi";
    const audience = session?.audience === "b2b" ? "b2b" : "b2c";
    if (method === "net30" && audience !== "b2b") return err(422, "Net-30 is a B2B payment term");

    const order = await getProvider().createOrder(
      {
        audience,
        userId: session?.userId,
        customer: {
          name: String(customer.name).trim(),
          phone: String(customer.phone),
          pincode: String(customer.pincode),
        },
        items: body.items.map((it: { productId: string; serial?: string; qty?: number }) => ({
          productId: String(it.productId),
          serial: it.serial ? String(it.serial) : undefined,
          qty: Math.max(1, Number(it.qty ?? 1)),
        })),
        mode: body.mode === "pickup" ? "pickup" : "delivery",
        payment: { method },
        tradeInCredit: body.tradeInCredit ? Math.max(0, Number(body.tradeInCredit)) : undefined,
        tradeInDevice: body.tradeInDevice ? String(body.tradeInDevice).slice(0, 80) : undefined,
        gstin: body.gstin ? String(body.gstin) : undefined,
      },
      session ? { userId: session.userId, role: session.role } : SYSTEM_ACTOR,
    );
    return ok(order, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
