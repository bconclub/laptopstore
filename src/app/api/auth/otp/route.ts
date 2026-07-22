import { NextRequest } from "next/server";
import { ok, err, handleError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/**
 * Mock OTP request. Always "sends" 0000. Real SMS/Supabase OTP replaces this
 * at swap time; the client flow is identical.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const phone = String(body?.phone ?? "");
    if (!/^[6-9]\d{9}$/.test(phone)) return err(422, "Enter a valid 10-digit mobile number");
    return ok({ sent: true, phone, hint: "Mock build: OTP is 0000" });
  } catch (e) {
    return handleError(e);
  }
}
