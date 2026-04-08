import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse } from "@/lib/response";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return successResponse({ valid: false, reason: "not_found" });
    }

    const user = await prisma.user.findFirst({
      where: { inviteToken: token },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        isActive: true,
        inviteExpiresAt: true,
      },
    });

    if (!user) {
      return successResponse({ valid: false, reason: "not_found" });
    }

    if (user.isActive) {
      return successResponse({ valid: false, reason: "already_used" });
    }

    if (!user.inviteExpiresAt || user.inviteExpiresAt < new Date()) {
      return successResponse({ valid: false, reason: "expired" });
    }

    return successResponse({
      valid: true,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
    });
  } catch (error) {
    console.error("Invite validate error:", error);
    return successResponse({ valid: false, reason: "not_found" });
  }
}
