import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";

export const POST = withAuth(
  async (request: NextRequest, _ctx, user: AuthUser) => {
    try {
      const { points } = await request.json();

      if (!points || points <= 0) {
        return errorResponse("Points must be greater than 0", 422);
      }

      const guestProfile = await prisma.guestProfile.findUnique({
        where: { userId: user.id },
      });

      if (!guestProfile) {
        return errorResponse("Guest profile not found", 404);
      }

      if (guestProfile.totalPoints < points) {
        return errorResponse("Insufficient points", 422);
      }

      const discount = (points / 100) * 10; // 100 pts = $10

      return successResponse({
        pointsToRedeem: points,
        discount,
        remainingPoints: guestProfile.totalPoints - points,
      });
    } catch (error) {
      console.error("Loyalty redeem error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
);
