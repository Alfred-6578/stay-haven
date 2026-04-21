import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import { POINTS_VALUE_NGN } from "@/lib/loyalty";

export const GET = withAuth(
  async () => {
    try {
      // Aggregate EARNED vs REDEEMED
      const [earnedAgg, redeemedAgg] = await Promise.all([
        prisma.loyaltyTransaction.aggregate({
          where: { type: { in: ["EARNED", "BONUS"] } },
          _sum: { points: true },
        }),
        prisma.loyaltyTransaction.aggregate({
          where: { type: "REDEEMED" },
          _sum: { points: true },
        }),
      ]);

      const totalPointsIssued = earnedAgg._sum.points || 0;
      // REDEEMED transactions store negative values; take abs
      const totalPointsRedeemed = Math.abs(redeemedAgg._sum.points || 0);
      const pointsOutstanding = totalPointsIssued - totalPointsRedeemed;
      const pointsOutstandingValue = pointsOutstanding * POINTS_VALUE_NGN;

      // Tier breakdown — count guests per loyaltyTier
      const tierCounts = await prisma.guestProfile.groupBy({
        by: ["loyaltyTier"],
        _count: { _all: true },
      });
      const tierBreakdown: Record<string, number> = {};
      for (const row of tierCounts) {
        tierBreakdown[row.loyaltyTier] = row._count._all;
      }

      // Top 10 guests by lifetimePoints
      const topProfiles = await prisma.guestProfile.findMany({
        orderBy: { lifetimePoints: "desc" },
        take: 10,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });
      const topGuests = topProfiles.map((p) => ({
        id: p.user.id,
        firstName: p.user.firstName,
        lastName: p.user.lastName,
        email: p.user.email,
        loyaltyTier: p.loyaltyTier,
        totalPoints: p.totalPoints,
        lifetimePoints: p.lifetimePoints,
        totalSpend: Number(p.totalSpend),
      }));

      // Average points per guest (among those who have at least 1 transaction)
      const guestsWithTx = await prisma.loyaltyTransaction.findMany({
        distinct: ["guestId"],
        select: { guestId: true },
      });
      const guestIdsWithTx = guestsWithTx.map((g) => g.guestId);
      let avgPointsPerGuest = 0;
      if (guestIdsWithTx.length > 0) {
        const sumResult = await prisma.guestProfile.aggregate({
          where: { userId: { in: guestIdsWithTx } },
          _sum: { lifetimePoints: true },
        });
        avgPointsPerGuest = Math.round(
          (sumResult._sum.lifetimePoints || 0) / guestIdsWithTx.length
        );
      }

      return successResponse({
        totalPointsIssued,
        totalPointsRedeemed,
        pointsOutstanding,
        pointsOutstandingValue,
        tierBreakdown,
        topGuests,
        avgPointsPerGuest,
        pointsValueNgn: POINTS_VALUE_NGN,
      });
    } catch (error) {
      console.error("Admin loyalty stats error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["ADMIN", "MANAGER"]
);
