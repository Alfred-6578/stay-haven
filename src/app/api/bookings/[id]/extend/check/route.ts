import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import { calculateBookingPrice } from "@/lib/bookingUtils";

/**
 * GET /api/bookings/[id]/extend/check?newCheckOut=ISO
 * Checks whether the guest's current room is free between current checkOut
 * and the requested newCheckOut, and returns additional pricing.
 */
export const GET = withAuth<{ id: string }>(
  async (
    request: NextRequest,
    ctx: RouteContext<{ id: string }>,
    user: AuthUser
  ) => {
    try {
      const { id } = await ctx.params;
      const { searchParams } = new URL(request.url);
      const newCheckOutParam = searchParams.get("newCheckOut");

      if (!newCheckOutParam) {
        return errorResponse("newCheckOut is required", 422);
      }

      const newCheckOut = new Date(newCheckOutParam);
      if (isNaN(newCheckOut.getTime())) {
        return errorResponse("Invalid newCheckOut date", 422);
      }

      const booking = await prisma.booking.findUnique({
        where: { id },
        include: {
          room: {
            include: {
              roomType: {
                select: { basePrice: true, weekendMultiplier: true },
              },
            },
          },
        },
      });
      if (!booking) return errorResponse("Booking not found", 404);

      const isStaff = ["STAFF", "MANAGER", "ADMIN"].includes(user.role);
      if (!isStaff && booking.guestId !== user.id) {
        return errorResponse("Forbidden", 403);
      }

      if (!["CONFIRMED", "CHECKED_IN"].includes(booking.status)) {
        return errorResponse(
          "Extension is only available for confirmed or checked-in bookings",
          422
        );
      }

      if (newCheckOut <= booking.checkOut) {
        return errorResponse(
          "New checkout must be after the current checkout",
          422
        );
      }

      // Nights between old and new checkout
      const msPerDay = 24 * 60 * 60 * 1000;
      const additionalNights = Math.round(
        (newCheckOut.getTime() - booking.checkOut.getTime()) / msPerDay
      );

      // Conflict check: any booking on the same room whose window overlaps
      // (booking.checkOut, newCheckOut], excluding this booking itself.
      const conflicting = await prisma.booking.findFirst({
        where: {
          roomId: booking.roomId,
          id: { not: booking.id },
          status: { in: ["CONFIRMED", "CHECKED_IN", "PENDING"] },
          checkIn: { lt: newCheckOut },
          checkOut: { gt: booking.checkOut },
        },
        select: { checkIn: true },
        orderBy: { checkIn: "asc" },
      });

      if (conflicting) {
        // Earliest free date the guest could extend to is the next booking's
        // check-in day (they'd have to leave before that booking starts).
        return successResponse({
          available: false,
          earliestAvailable: conflicting.checkIn,
        });
      }

      const { baseAmount, taxAmount, totalAmount } = calculateBookingPrice(
        booking.room.roomType,
        booking.checkOut,
        newCheckOut
      );

      return successResponse({
        available: true,
        additionalNights,
        additionalAmount: baseAmount,
        taxAmount,
        totalAdditional: totalAmount,
        newCheckOut,
      });
    } catch (error) {
      console.error("Extend check error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
);
