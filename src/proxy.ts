import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/invite",
];

const STAFF_ROLES = new Set(["STAFF", "MANAGER", "ADMIN"]);

/**
 * Edge-compatible base64url decode for JWT payload.
 * We don't verify the signature here — this is just a lightweight
 * hint for redirecting. Invalid tokens will be rejected by the
 * protected routes/AuthContext anyway.
 */
function decodeJwtPayload(token: string): { role?: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only act on auth paths
  if (!AUTH_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // If the user has a refresh token, consider them logged in
  const refreshToken = request.cookies.get("stayhaven_refresh")?.value;
  if (!refreshToken) {
    return NextResponse.next();
  }

  const payload = decodeJwtPayload(refreshToken);
  const isStaff = payload?.role && STAFF_ROLES.has(payload.role);

  const dest = isStaff ? "/staff/dashboard" : "/dashboard";
  return NextResponse.redirect(new URL(dest, request.url));
}

export const config = {
  matcher: [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/invite",
  ],
};
