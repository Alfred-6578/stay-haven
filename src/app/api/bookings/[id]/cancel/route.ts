import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import { bookingCancellationEmail } from "@/lib/email";

export const PATCH = withAuth<{ id: string }>(
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
          guest: { select: { id: true, firstName: true, email: true } },
          payment: true,
        },
      });

      if (!booking) {
        return errorResponse("Booking not found", 404);
      }

      const isStaff = ["ADMIN", "MANAGER", "STAFF"].includes(user.role);

      // Guests can only cancel their own
      if (!isStaff && booking.guestId !== user.id) {
        return errorResponse("Forbidden", 403);
      }

      // Guests cannot cancel CHECKED_IN or already terminal statuses
      if (!isStaff) {
        if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
          return errorResponse(
            "Cannot cancel a booking that is checked in, checked out, or already cancelled",
            422
          );
        }
      } else {
        if (booking.status === "CHECKED_OUT" || booking.status === "CANCELLED") {
          return errorResponse("Cannot cancel this booking", 422);
        }
      }

      // Update booking
      const updated = await prisma.booking.update({
        where: { id },
        data: { status: "CANCELLED" },
        include: { room: { include: { roomType: true } } },
      });

      // Mark payment as refunded if completed
      if (booking.payment && booking.payment.status === "COMPLETED") {
        await prisma.payment.update({
          where: { id: booking.payment.id },
          data: { status: "REFUNDED" },
        });
      }

      // Notification
      await prisma.notification.create({
        data: {
          userId: booking.guestId,
          title: "Booking Cancelled",
          message: `Your booking ${booking.bookingRef} has been cancelled.`,
          type: "BOOKING_CANCELLED",
          bookingId: booking.id,
        },
      });

      // Email
      bookingCancellationEmail(
        { firstName: booking.guest.firstName, email: booking.guest.email },
        {
          bookingRef: booking.bookingRef,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
        }
      );

      return successResponse(updated, "Booking cancelled");
    } catch (error) {
      console.error("Cancel booking error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
);
