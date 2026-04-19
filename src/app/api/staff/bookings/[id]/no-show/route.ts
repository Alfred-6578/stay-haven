import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import { createNotification } from "@/lib/notifications";

/**
 * POST /api/staff/bookings/[id]/no-show
 * Marks a CONFIRMED booking as NO_SHOW when the guest didn't arrive.
 * Frees the room back to AVAILABLE.
 */
export const POST = withAuth<{ id: string }>(
  async (
    _request: NextRequest,
    ctx: RouteContext<{ id: string }>,
    _user: AuthUser
  ) => {
    try {
      const { id } = await ctx.params;

      const booking = await prisma.booking.findUnique({
        where: { id },
        include: {
          guest: { select: { firstName: true, lastName: true } },
          room: { select: { id: true, number: true, status: true } },
        },
      });

      if (!booking) return errorResponse("Booking not found", 404);
      if (booking.status !== "CONFIRMED") {
        return errorResponse(
          `Cannot mark as no-show: booking is ${booking.status}`,
          422
        );
      }

      // Only allow if check-in date has passed
      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      if (new Date(booking.checkIn) > startOfToday) {
        return errorResponse(
          "Cannot mark as no-show before the check-in date",
          422
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.booking.update({
          where: { id },
          data: { status: "NO_SHOW" },
        });

        // Always free the room back to AVAILABLE regardless of its current
        // status — the booking is void, so the room should not be held.
        await tx.room.update({
          where: { id: booking.room.id },
          data: { status: "AVAILABLE" },
        });
      });

      await createNotification({
        userId: booking.guestId,
        title: "Booking Marked as No-Show",
        message: `Your booking ${booking.bookingRef} for Room ${booking.room.number} has been marked as a no-show. Contact the front desk if this was an error.`,
        type: "GENERAL",
        bookingId: id,
      });

      return successResponse(
        null,
        `${booking.guest.firstName} ${booking.guest.lastName} marked as no-show for Room ${booking.room.number}`
      );
    } catch (error) {
      console.error("No-show error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["STAFF", "MANAGER", "ADMIN"]
);
