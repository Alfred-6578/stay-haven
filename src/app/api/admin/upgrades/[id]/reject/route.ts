import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import { createNotification } from "@/lib/notifications";

export const PATCH = withAuth<{ id: string }>(
  async (
    _request: NextRequest,
    ctx: RouteContext<{ id: string }>,
    user: AuthUser
  ) => {
    try {
      const { id } = await ctx.params;

      const upgrade = await prisma.roomUpgradeRequest.findUnique({
        where: { id },
        include: {
          booking: {
            select: { id: true, guestId: true },
          },
          requestedType: {
            select: { name: true },
          },
        },
      });

      if (!upgrade) return errorResponse("Upgrade request not found", 404);
      if (upgrade.status !== "PENDING") {
        return errorResponse(
          `Cannot reject a ${upgrade.status} request`,
          422
        );
      }

      await prisma.roomUpgradeRequest.update({
        where: { id },
        data: {
          status: "REJECTED",
          processedById: user.id,
          processedAt: new Date(),
        },
      });

      await createNotification({
        userId: upgrade.booking.guestId,
        title: "Upgrade Unavailable",
        message: `Your upgrade request to ${upgrade.requestedType.name} was not available at this time.`,
        type: "GENERAL",
        bookingId: upgrade.booking.id,
      });

      return successResponse(null, "Upgrade request rejected");
    } catch (error) {
      console.error("Upgrade reject error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["ADMIN", "MANAGER"]
);
