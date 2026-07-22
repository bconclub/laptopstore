import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, encodeSession, type Session } from "@/lib/auth";
import { err, handleError } from "@/lib/api-helpers";
import { getProvider } from "@/lib/provider";

export const dynamic = "force-dynamic";

const MOCK_OTP = "0000";

/**
 * Verify mock OTP → set session cookie.
 * Known phone → that user's role/audience. Unknown phone → guest b2c customer
 * (account-lite order tracking works purely off the phone).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const phone = String(body?.phone ?? "");
    const otp = String(body?.otp ?? "");
    if (!/^[6-9]\d{9}$/.test(phone)) return err(422, "Enter a valid 10-digit mobile number");
    if (otp !== MOCK_OTP) return err(401, "Incorrect OTP");

    const user = await getProvider().getUserByPhone(phone);
    const session: Session = user
      ? { userId: user.id, role: user.role, audience: user.audience, phone: user.phone, name: user.name }
      : { userId: `guest-${phone}`, role: "customer", audience: "b2c", phone };

    const res = NextResponse.json({ ok: true, data: { session } });
    res.cookies.set(SESSION_COOKIE, encodeSession(session), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (e) {
    return handleError(e);
  }
}
