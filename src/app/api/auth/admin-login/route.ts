import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, encodeSession, isAdminRole, type Session } from "@/lib/auth";
import { err, handleError } from "@/lib/api-helpers";
import { getProvider } from "@/lib/provider";

export const dynamic = "force-dynamic";

/**
 * Admin login (mock build). Two paths:
 *  - POST { password }            → signs in as the HQ admin (the normal way in)
 *  - POST { userId, password? }   → demo role views (Store Manager, desks)
 *
 * Password = ADMIN_PASSWORD env, falling back to the demo default below.
 * When ADMIN_PASSWORD is set (e.g. on Vercel), the userId path requires the
 * password too; locally without the env, one-click role logins and the
 * simulation harness keep working unchanged. Supabase Auth replaces all of
 * this at swap time.
 */
const DEMO_PASSWORD = "laptopstore@2026";
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
    const password = String(body?.password ?? "");
    const required = process.env.ADMIN_PASSWORD || DEMO_PASSWORD;

    // Password-only login → HQ admin. userId login needs the password too
    // whenever ADMIN_PASSWORD is explicitly set (deployed builds).
    if (!userId || password || process.env.ADMIN_PASSWORD) {
      if (password !== required) return err(403, "Wrong password");
    }

    const user = userId
      ? await getProvider().getUserById(userId)
      : (await getProvider().getUsers()).find((u) => u.role === "hq_admin");
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
