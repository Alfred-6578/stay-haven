import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import { LOYALTY_TIERS } from "@/lib/loyalty";

const awardSchema = z.object({
  guestId: z.string().min(1),
  points: z.number().int().refine((p) => p !== 0, "Points cannot be zero"),
  description: z.string().min(1).max(200),
});

function tierForPoints(lifetimePoints: number): keyof typeof LOYALTY_TIERS {
  const order: Array<keyof typeof LOYALTY_TIERS> = [
    "PLATINUM",
    "GOLD",
    "SILVER",
    "BRONZE",
  ];
  for (const tier of order) {
    if (lifetimePoints >= LOYALTY_TIERS[tier].threshold) return tier;
  }
  return "BRONZE";
}

export const POST = withAuth(
  async (request: NextRequest) => {
    try {
      const body = await request.json();
      const parsed = awardSchema.safeParse(body);
      if (!parsed.success) {
        const message = parsed.error.issues
          .map((i: { message: string }) => i.message)
          .join(", ");
        return errorResponse(message, 422);
      }

      const { guestId, points, description } = parsed.data;

      const guest = await prisma.user.findFirst({
        where: { id: guestId, role: "GUEST", isDeleted: false },
        include: { guestProfile: true },
      });

      if (!guest || !guest.guestProfile) {
        return errorResponse("Guest not found", 404);
      }

      const newTotal = guest.guestProfile.totalPoints + points;
      if (newTotal < 0) {
        return errorResponse(
          "Deduction exceeds current points balance",
          422
        );
      }

      // Only bonuses count toward lifetime (deductions don't)
      const newLifetime =
        points > 0
          ? guest.guestProfile.lifetimePoints + points
          : guest.guestProfile.lifetimePoints;

      const newTier = tierForPoints(newLifetime);

      const result = await prisma.$transaction(async (tx) => {
        const transaction = await tx.loyaltyTransaction.create({
          data: {
            guestId,
            points,
            type: points > 0 ? "BONUS" : "ADJUSTMENT",
            description,
          },
        });

        const profile = await tx.guestProfile.update({
          where: { userId: guestId },
          data: {
            totalPoints: newTotal,
            lifetimePoints: newLifetime,
            loyaltyTier: newTier,
          },
        });

        await tx.notification.create({
          data: {
            userId: guestId,
            title: points > 0 ? "Points Awarded" : "Points Adjusted",
            message:
              points > 0
                ? `You earned ${points} bonus points: ${description}`
                : `${Math.abs(points)} points were deducted: ${description}`,
            type: points > 0 ? "POINTS_EARNED" : "GENERAL",
          },
        });

        return { transaction, profile };
      });

      return successResponse(
        {
          transaction: result.transaction,
          profile: result.profile,
          tierChanged: guest.guestProfile.loyaltyTier !== newTier,
        },
        points > 0 ? "Points awarded" : "Points adjusted"
      );
    } catch (error) {
      console.error("Loyalty award error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["ADMIN", "MANAGER"]
);
