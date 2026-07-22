import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, encodeSession, isAdminRole, type Session } from "@/lib/auth";
import { err, handleError } from "@/lib/api-helpers";
import { getProvider } from "@/lib/provider";

export const dynamic = "force-dynamic";

/**
 * One-click admin login (mock build): POST { userId } for any seeded staff
 * user. Replaced by Supabase Auth at swap time. GET lists the staff roster
 * for the login page.
 */
export async function GET() {
  try {
    const users = await getProvider().getUsers();
    return NextResponse.json({
      ok: true,
      data: users.filter((u) => u.role !== "customer").map((u) => ({ id: u.id, name: u.name, role: u.role, nodeId: u.nodeId })),
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const userId = String(body?.userId ?? "");
    const user = await getProvider().getUserById(userId);
    if (!user || !isAdminRole(user.role)) return err(403, "Not a staff user");

    const session: Session = {
      userId: user.id,
      role: user.role,
      audience: user.audience,
      phone: user.phone,
      name: user.name,
    };
    const res = NextResponse.json({ ok: true, data: { session } });
    res.cookies.set(SESSION_COOKIE, encodeSession(session), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return res;
  } catch (e) {
    return handleError(e);
  }
}
