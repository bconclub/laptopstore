import { NextRequest } from "next/server";
import { ok, handleError } from "@/lib/api-helpers";
import { requireRole } from "@/lib/auth";
import { getProvider } from "@/lib/provider";
import type { Role } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireRole("hq_admin");
    const role = req.nextUrl.searchParams.get("role");
    const users = await getProvider().getUsers({ role: (role as Role) ?? undefined });
    return ok(users);
  } catch (e) {
    return handleError(e);
  }
}
