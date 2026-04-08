import { NextRequest } from "next/server";
import { serialize } from "cookie";
import { prisma } from "@/lib/prisma";
import { getRefreshToken } from "@/lib/cookies";
import { verifyRefreshToken, signAccessToken } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/response";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

export async function POST(request: NextRequest) {
  try {
    const token = getRefreshToken(request);
    if (!token) {
      return errorResponse("Unauthorized", 401);
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      return errorResponse("Unauthorized", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return errorResponse("Unauthorized", 401);
    }

    const newAccessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const response = successResponse(null, "Token refreshed");

    response.headers.append(
      "Set-Cookie",
      serialize("stayhaven_access", newAccessToken, {
        httpOnly: true,
        secure: IS_PRODUCTION,
        sameSite: "lax",
        path: "/",
        maxAge: 15 * 60,
      })
    );

    return response;
  } catch (error) {
    console.error("Refresh error:", error);
    return errorResponse("Unauthorized", 401);
  }
}
