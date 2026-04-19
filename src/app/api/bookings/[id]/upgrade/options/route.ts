import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";

/**
 * GET /api/bookings/[id]/upgrade/options
 * Returns available room types for upgrade (higher price than current).
 */
export const GET = withAuth<{ id: string }>(
  async (
    _request: NextRequest,
    ctx: RouteContext<{ id: string }>,
    user: AuthUser
  ) => {
    try {
      const { id } = await ctx.params;

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

      const currentBasePrice = Number(booking.room.roomType.basePrice);
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);

      // Find room types with higher base price
      const higherTypes = await prisma.roomType.findMany({
        where: {
          isActive: true,
          basePrice: { gt: currentBasePrice },
          id: { not: booking.room.roomType.id },
        },
        include: {
          rooms: {
            where: { isActive: true },
            select: { id: true, number: true, floor: true, status: true },
          },
        },
        orderBy: { basePrice: "asc" },
      });

      // For each higher type, check room availability for booking dates
      const options = [];
      for (const rt of higherTypes) {
        // Find rooms not in conflicting bookings AND status is AVAILABLE
        const availableRooms = [];
        for (const room of rt.rooms) {
          if (room.status !== "AVAILABLE" && room.status !== "OCCUPIED") continue;
          // Check no conflicting booking (exclude current booking since it would be moved)
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
            availableRooms.push(room);
          }
        }

        if (availableRooms.length > 0) {
          const priceDifference =
            (Number(rt.basePrice) - currentBasePrice) * booking.totalNights;
          options.push({
            roomType: {
              id: rt.id,
              name: rt.name,
              image: rt.image,
              images: rt.images,
              amenities: rt.amenities,
              capacity: rt.capacity,
              basePrice: Number(rt.basePrice),
            },
            availableCount: availableRooms.length,
            priceDifference: Math.round(priceDifference * 100) / 100,
            newTotalEstimate:
              Math.round(
                (Number(booking.totalAmount) + priceDifference) * 100
              ) / 100,
          });
        }
      }

      return successResponse(options);
    } catch (error) {
      console.error("Upgrade options error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
);
