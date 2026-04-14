import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import { overstayWarningEmail } from "@/lib/email";

export const POST = withAuth<{ bookingId: string }>(
  async (_request: NextRequest, ctx: RouteContext<{ bookingId: string }>) => {
    try {
      const { bookingId } = await ctx.params;

      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: {
          id: true,
          bookingRef: true,
          checkOut: true,
          status: true,
          guestId: true,
          guest: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      });

      if (!booking) {
        return errorResponse("Booking not found", 404);
      }

      if (booking.status !== "CHECKED_IN" || booking.checkOut >= new Date()) {
        return errorResponse("Booking is not currently overstaying", 422);
      }

      const checkOutFormatted = booking.checkOut.toLocaleString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });

      await prisma.notification.create({
        data: {
          userId: booking.guestId,
          title: "Overstay Notice",
          message: `Your checkout was scheduled for ${checkOutFormatted}. Please contact the front desk.`,
          type: "OVERSTAY_WARNING",
          bookingId: booking.id,
        },
      });

      // Send email (fire and forget — don't block on email delivery)
      overstayWarningEmail(
        { firstName: booking.guest.firstName, email: booking.guest.email },
        { bookingRef: booking.bookingRef, checkOut: booking.checkOut }
      ).catch((err) => console.error("Overstay email failed:", err));

      return successResponse({
        bookingRef: booking.bookingRef,
        notifiedGuest: `${booking.guest.firstName} ${booking.guest.lastName}`,
      }, "Guest notified");
    } catch (error) {
      console.error("Overstay notify error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["ADMIN", "MANAGER"]
);
