import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import { getRoomServiceBalance } from "@/lib/roomServiceBalance";

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
          room: { include: { roomType: true } },
          payment: true,
          roomServiceOrders: {
            orderBy: { createdAt: "desc" },
          },
          serviceBookings: {
            include: { service: { select: { name: true, category: true } } },
            orderBy: { createdAt: "desc" },
          },
          upgradeRequest: {
            include: { requestedType: { select: { name: true, basePrice: true } } },
          },
          stayExtension: true,
        },
      });

      if (!booking) {
        return errorResponse("Booking not found", 404);
      }

      if (booking.guestId !== user.id) {
        return errorResponse("Forbidden", 403);
      }

      // Compute extra fields
      const now = new Date();
      const checkInDate = new Date(booking.checkIn);
      const checkOutDate = new Date(booking.checkOut);

      let daysUntilCheckIn: number | null = null;
      if (checkInDate > now) {
        daysUntilCheckIn = Math.ceil(
          (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
      }

      let nightsStayed: number | null = null;
      if (booking.status === "CHECKED_OUT" && booking.checkInAt) {
        const actualCheckOut = booking.checkOutAt || checkOutDate;
        nightsStayed = Math.ceil(
          (actualCheckOut.getTime() - booking.checkInAt.getTime()) /
            (1000 * 60 * 60 * 24)
        );
      }

      const roomServiceBalance = await getRoomServiceBalance(booking.id);

      return successResponse({
        ...booking,
        daysUntilCheckIn,
        nightsStayed,
        roomServiceBalance,
      });
    } catch (error) {
      console.error("Guest booking detail error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
);
