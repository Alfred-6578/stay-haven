import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import { getNextTier, getTierProgress, POINTS_VALUE_NGN } from "@/lib/loyalty";

export const GET = withAuth(
  async (_request: NextRequest, _ctx, user: AuthUser) => {
    try {
      const guestProfile = await prisma.guestProfile.findUnique({
        where: { userId: user.id },
      });

      if (!guestProfile) {
        return errorResponse("Guest profile not found", 404);
      }

      const recentTransactions = await prisma.loyaltyTransaction.findMany({
        where: { guestId: user.id },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          booking: { select: { bookingRef: true } },
        },
      });

      const nextTier = getNextTier(
        guestProfile.loyaltyTier,
        guestProfile.lifetimePoints
      );
      const tierProgress = getTierProgress(
        guestProfile.loyaltyTier,
        guestProfile.lifetimePoints
      );

      return successResponse({
        tier: guestProfile.loyaltyTier,
        totalPoints: guestProfile.totalPoints,
        lifetimePoints: guestProfile.lifetimePoints,
        pointsValue: guestProfile.totalPoints * POINTS_VALUE_NGN,
        nextTier,
        tierProgress,
        recentTransactions: recentTransactions.map((t) => ({
          id: t.id,
          points: t.points,
          type: t.type,
          description: t.description,
          bookingRef: t.booking?.bookingRef || null,
          createdAt: t.createdAt,
        })),
        totalStays: guestProfile.totalStays,
        totalSpend: guestProfile.totalSpend,
      });
    } catch (error) {
      console.error("Guest loyalty error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
);
