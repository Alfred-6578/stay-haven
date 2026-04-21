import { serialize, parse } from "cookie";
import { NextRequest, NextResponse } from "next/server";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: "lax" as const,
  path: "/",
};

export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string
): void {
  response.headers.append(
    "Set-Cookie",
    serialize("stayhaven_access", accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60, // 15 minutes
    })
  );
  response.headers.append(
    "Set-Cookie",
    serialize("stayhaven_refresh", refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })
  );
}

export function clearAuthCookies(response: NextResponse): void {
  response.headers.append(
    "Set-Cookie",
    serialize("stayhaven_access", "", {
      ...COOKIE_OPTIONS,
      maxAge: 0,
    })
  );
  response.headers.append(
    "Set-Cookie",
    serialize("stayhaven_refresh", "", {
      ...COOKIE_OPTIONS,
      maxAge: 0,
    })
  );
}

export function getAccessToken(request: NextRequest): string | undefined {
  const cookies = parse(request.headers.get("cookie") || "");
  return cookies.stayhaven_access;
}

export function getRefreshToken(request: NextRequest): string | undefined {
  const cookies = parse(request.headers.get("cookie") || "");
  return cookies.stayhaven_refresh;
}
