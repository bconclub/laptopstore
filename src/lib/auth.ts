/**
 * Mock auth — HMAC-signed session cookie.
 *
 * Session = {userId, role, audience} signed with SESSION_SECRET (dev default
 * baked in; set the env on Vercel). Storefront login = phone + mock OTP
 * "0000"; admin login = one-click seeded user per role.
 *
 * Swap plan: this module becomes a wrapper over Supabase Auth — getSession()
 * reads the Supabase cookie instead; call sites never change.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { Audience, Role } from "@/lib/types";

export const SESSION_COOKIE = "lsi-session";
const SECRET = process.env.SESSION_SECRET || "lsi-dev-secret-not-for-prod";

export interface Session {
  userId: string;
  role: Role;
  audience: Audience;
  phone?: string;
  name?: string;
}

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export function encodeSession(session: Session): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(token: string | undefined): Session | undefined {
  if (!token) return undefined;
  const dot = token.lastIndexOf(".");
  if (dot === -1) return undefined;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(payload);
  try {
    if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return undefined;
    }
    return JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
  } catch {
    return undefined;
  }
}

/** Server components / route handlers: current session or undefined. */
export async function getSession(): Promise<Session | undefined> {
  const jar = await cookies();
  return decodeSession(jar.get(SESSION_COOKIE)?.value);
}

const ADMIN_ROLES: Role[] = ["hq_admin", "outlet_manager", "distributor", "repair_desk", "b2b_desk"];

export function isAdminRole(role: Role | undefined): boolean {
  return !!role && ADMIN_ROLES.includes(role);
}

/** Route-handler guard: returns the session or throws a 401/403 marker. */
export class AuthError extends Error {
  constructor(readonly status: 401 | 403, message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) throw new AuthError(401, "Not signed in");
  return s;
}

export async function requireRole(...roles: Role[]): Promise<Session> {
  const s = await requireSession();
  if (!roles.includes(s.role)) throw new AuthError(403, `Requires role: ${roles.join(" | ")}`);
  return s;
}

export async function requireAdmin(): Promise<Session> {
  const s = await requireSession();
  if (!isAdminRole(s.role)) throw new AuthError(403, "Admin access required");
  return s;
}
