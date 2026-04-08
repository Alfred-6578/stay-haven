import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccessToken } from "@/lib/cookies";
import { verifyAccessToken } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/response";

export async function GET(request: NextRequest) {
  try {
    const token = getAccessToken(request);
    if (!token) {
      return errorResponse("Unauthorized", 401);
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch {
      return errorResponse("Unauthorized", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { guestProfile: true, staffProfile: true },
    });

    if (!user || !user.isActive) {
      return errorResponse("Unauthorized", 401);
    }

    const { passwordHash: _, ...userWithoutPassword } = user;

    return successResponse(userWithoutPassword);
  } catch (error) {
    console.error("Auth me error:", error);
    return errorResponse("Unauthorized", 401);
  }
}
