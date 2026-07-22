/**
 * Shared route-handler helpers: JSON responses, error mapping (state-machine
 * 409s carry the allowed-transitions list), actor resolution from session.
 */

import { NextResponse } from "next/server";
import { AuthError, type Session } from "@/lib/auth";
import { TransitionError } from "@/lib/state-machines";
import type { Actor } from "@/lib/provider/contract";

export function ok(data: unknown, init?: ResponseInit): NextResponse {
  return NextResponse.json({ ok: true, data }, init);
}

export function err(status: number, message: string, extra?: Record<string, unknown>): NextResponse {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

export function handleError(e: unknown): NextResponse {
  if (e instanceof AuthError) return err(e.status, e.message);
  if (e instanceof TransitionError) return err(409, e.message, { allowed: e.allowed });
  const message = e instanceof Error ? e.message : "Unknown error";
  // Domain validation errors (stock, serials, availability) → 422
  if (/stock|serial|available|fulfillable|not found|unknown|read-only|without a quote|negative/i.test(message)) {
    const status = /not found|unknown/i.test(message) ? 404 : 422;
    return err(status, message);
  }
  console.error("[api] unhandled:", e);
  return err(500, message);
}

export function actorOf(session: Session): Actor {
  return { userId: session.userId, role: session.role, nodeId: undefined };
}

export async function actorWithNode(session: Session): Promise<Actor> {
  // Node scope for outlet/distributor/repair roles comes from the user record
  const { getProvider } = await import("@/lib/provider");
  const user = await getProvider().getUserById(session.userId);
  return { userId: session.userId, role: session.role, nodeId: user?.nodeId };
}
