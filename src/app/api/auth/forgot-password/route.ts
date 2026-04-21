import { NextRequest } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/response";
import { passwordResetEmail } from "@/lib/email";
import { enforceRateLimit } from "@/lib/rateLimit";

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(
    request,
    "auth:forgot-password",
    3,
    60 * 60 * 1000
  );
  if (limited) return limited;

  try {
    const { email } = await request.json();

    if (!email) {
      return errorResponse("Email is required", 422);
    }

    const user = await prisma.user.findFirst({
      where: { email, isActive: true, isDeleted: false },
    });

    if (user) {
      if (user.resetExpiresAt) {
        const issuedAt = new Date(user.resetExpiresAt.getTime() - 60 * 60 * 1000);
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
        if (issuedAt > twoMinutesAgo) {
          return successResponse(
            null,
            "If an account with that email exists, a reset link has been sent"
          );
        }
      }

      const rawToken = crypto.randomBytes(32).toString("hex");
      const resetToken = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");
      const resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken, resetExpiresAt },
      });

      const resetLink = `${CLIENT_URL}/reset-password?token=${rawToken}`;
      await passwordResetEmail(
        { firstName: user.firstName, email: user.email },
        resetLink
      );
    }

    // Always return success to prevent email enumeration
    return successResponse(
      null,
      "If an account with that email exists, a reset link has been sent"
    );
  } catch (error) {
    console.error("Forgot password error:", error);
    return errorResponse("Internal server error", 500);
  }
}
