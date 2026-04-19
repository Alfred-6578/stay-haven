import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import { createNotification } from "@/lib/notifications";

/**
 * POST /api/bookings/[id]/upgrade/request
 * Guest requests an upgrade to a higher room type.
 */
export const POST = withAuth<{ id: string }>(
  async (
    request: NextRequest,
    ctx: RouteContext<{ id: string }>,
    user: AuthUser
  ) => {
    try {
      const { id } = await ctx.params;
      const { requestedTypeId } = (await request.json()) as {
        requestedTypeId?: string;
      };

      if (!requestedTypeId) {
        return errorResponse("requestedTypeId is required", 422);
      }

      const booking = await prisma.booking.findUnique({
        where: { id },
        include: {
          room: {
            include: {
              roomType: { select: { id: true, basePrice: true } },
            },
          },
        },
      });
      if (!booking) return errorResponse("Booking not found", 404);
      if (booking.guestId !== user.id) {
        return errorResponse("Forbidden", 403);
      }
      if (!["CONFIRMED", "CHECKED_IN"].includes(booking.status)) {
        return errorResponse(
          "Upgrade is only available for confirmed or checked-in bookings",
          422
        );
      }

      // Check no existing PENDING upgrade
      const existing = await prisma.roomUpgradeRequest.findUnique({
        where: { bookingId: id },
      });
      if (existing && existing.status === "PENDING") {
        return errorResponse(
          "You already have a pending upgrade request for this booking",
          422
        );
      }

      // Validate requested type
      const requestedType = await prisma.roomType.findUnique({
        where: { id: requestedTypeId },
        include: {
          rooms: {
            where: { isActive: true },
            select: { id: true, status: true },
          },
        },
      });
      if (!requestedType || !requestedType.isActive) {
        return errorResponse("Requested room type not found", 404);
      }

      const currentBasePrice = Number(booking.room.roomType.basePrice);
      if (Number(requestedType.basePrice) <= currentBasePrice) {
        return errorResponse(
          "Requested type must be higher than current room type",
          422
        );
      }

      // Check at least one room of the requested type is available for the dates
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      let hasAvailable = false;

      for (const room of requestedType.rooms) {
        if (room.status !== "AVAILABLE" && room.status !== "OCCUPIED") continue;
        const conflicting = await prisma.booking.findFirst({
          where: {
            roomId: room.id,
            id: { not: booking.id },
            status: { in: ["CONFIRMED", "CHECKED_IN", "PENDING"] },
            NOT: [
              { checkOut: { lte: checkIn } },
              { checkIn: { gte: checkOut } },
            ],
          },
          select: { id: true },
        });
        if (!conflicting) {
          hasAvailable = true;
          break;
        }
      }

      if (!hasAvailable) {
        return errorResponse(
          "No rooms of this type available for your dates",
          409
        );
      }

      const priceDifference =
        Math.round(
          (Number(requestedType.basePrice) - currentBasePrice) *
            booking.totalNights *
            100
        ) / 100;

      // Upsert: if a prior APPROVED/REJECTED exists, replace it
      const upgrade = existing
        ? await prisma.roomUpgradeRequest.update({
            where: { bookingId: id },
            data: {
              currentRoomId: booking.roomId,
              requestedTypeId,
              priceDifference,
              status: "PENDING",
              processedById: null,
              processedAt: null,
              paymentReference: null,
            },
            include: {
              requestedType: {
                select: { name: true, basePrice: true },
              },
            },
          })
        : await prisma.roomUpgradeRequest.create({
            data: {
              bookingId: id,
              currentRoomId: booking.roomId,
              requestedTypeId,
              priceDifference,
              status: "PENDING",
            },
            include: {
              requestedType: {
                select: { name: true, basePrice: true },
              },
            },
          });

      await createNotification({
        userId: user.id,
        title: "Upgrade Requested",
        message: `Your upgrade request to ${upgrade.requestedType.name} is under review.`,
        type: "GENERAL",
        bookingId: id,
      });

      return successResponse(upgrade, "Upgrade request submitted", 201);
    } catch (error) {
      console.error("Upgrade request error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
);
