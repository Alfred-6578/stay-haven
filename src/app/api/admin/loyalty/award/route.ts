import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import { calculateTier } from "@/lib/loyalty";
import { createNotification } from "@/lib/notifications";

const awardSchema = z.object({
  userId: z.string().min(1),
  points: z.number().int().refine((p) => p !== 0, "Points cannot be zero"),
  description: z.string().min(1).max(200),
});

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

      const { userId, points, description } = parsed.data;

      const guest = await prisma.user.findFirst({
        where: { id: userId, role: "GUEST", isDeleted: false },
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

      // Only positive points count toward lifetime (deductions don't)
      const newLifetime =
        points > 0
          ? guest.guestProfile.lifetimePoints + points
          : guest.guestProfile.lifetimePoints;

      const newTier = calculateTier(newLifetime);
      const tierChanged = guest.guestProfile.loyaltyTier !== newTier;

      const result = await prisma.$transaction(async (tx) => {
        const transaction = await tx.loyaltyTransaction.create({
          data: {
            guestId: userId,
            points,
            type: points > 0 ? "EARNED" : "ADJUSTMENT",
            description,
          },
        });

        const profile = await tx.guestProfile.update({
          where: { userId },
          data: {
            totalPoints: newTotal,
            lifetimePoints: newLifetime,
            loyaltyTier: newTier,
          },
        });

        return { transaction, profile };
      });

      // Notification
      await createNotification({
        userId,
        title: points > 0 ? "Points Awarded" : "Points Adjusted",
        message:
          points > 0
            ? `You received ${points} bonus points from StayHaven! ${description}`
            : `${Math.abs(points)} points were deducted: ${description}`,
        type: points > 0 ? "POINTS_EARNED" : "GENERAL",
      });

      return successResponse(
        {
          transaction: result.transaction,
          newBalance: result.profile.totalPoints,
          newLifetime: result.profile.lifetimePoints,
          tier: result.profile.loyaltyTier,
          tierChanged,
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
