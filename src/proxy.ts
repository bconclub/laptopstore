/**
 * Next 16 proxy (the middleware rename) — optimistic /admin gate.
 * Deep auth checks (role per API) live in the route handlers via
 * requireAdmin/requireRole; this only redirects obviously-unauthenticated
 * page loads to /admin/login.
 */

import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "lsi-session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!token) {
      const login = new URL("/admin/login", request.url);
      login.searchParams.set("next", pathname);
      return NextResponse.redirect(login);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
