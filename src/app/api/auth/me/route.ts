import { ok } from "@/lib/api-helpers";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  return ok(session ?? null);
}
