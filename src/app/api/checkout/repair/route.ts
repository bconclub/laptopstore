import { NextRequest } from "next/server";
import { ok, err, handleError } from "@/lib/api-helpers";
import { getSession } from "@/lib/auth";
import { getProvider } from "@/lib/provider";
import { SYSTEM_ACTOR } from "@/lib/provider/contract";

export const dynamic = "force-dynamic";

/** Repair checkout (deck §07): routes to nearest service-capable node, books a job slot. */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const b = await req.json().catch(() => null);
    if (!b) return err(422, "JSON body required");
    const c = b.customer ?? {};
    if (!c.name || String(c.name).trim().length < 2) return err(422, "Name required");
    if (!/^[6-9]\d{9}$/.test(String(c.phone ?? ""))) return err(422, "Valid 10-digit phone required");
    if (!/^\d{6}$/.test(String(c.pincode ?? ""))) return err(422, "Valid 6-digit pincode required");
    if (!b.brand || !b.issue) return err(422, "Device brand and issue required");

    const job = await getProvider().createRepairJob(
      {
        customer: { name: String(c.name).trim(), phone: String(c.phone), pincode: String(c.pincode) },
        serviceType: String(b.serviceType ?? "diagnosis"),
        brand: String(b.brand),
        model: String(b.model ?? ""),
        issue: String(b.issue),
        mode: ["dropoff", "pickup", "onsite"].includes(b.mode) ? b.mode : "dropoff",
        slot: {
          date: String(b.slot?.date ?? new Date().toISOString().slice(0, 10)),
          window: String(b.slot?.window ?? "10:00-12:00"),
        },
        payAdvance: !!b.payAdvance,
      },
      session ? { userId: session.userId, role: session.role } : SYSTEM_ACTOR,
    );
    return ok(job, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
