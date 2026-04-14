import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";

export const POST = withAuth<{ id: string }>(
  async (_request: NextRequest, ctx: RouteContext<{ id: string }>, user) => {
    try {
      const { id } = await ctx.params;

      const booking = await prisma.booking.findUnique({
        where: { id },
        include: { room: true, payment: true },
      });

      if (!booking) {
        return errorResponse("Booking not found", 404);
      }

      if (booking.status !== "CONFIRMED") {
        return errorResponse(
          `Cannot check in a booking with status ${booking.status}`,
          422
        );
      }

      if (!booking.payment || booking.payment.status !== "COMPLETED") {
        return errorResponse("Payment has not been completed", 422);
      }

      const now = new Date();
      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 59, 999);
      if (booking.checkIn > endOfToday) {
        return errorResponse("Check-in date is in the future", 422);
      }

      const updated = await prisma.$transaction(async (tx) => {
        const updatedBooking = await tx.booking.update({
          where: { id },
          data: {
            status: "CHECKED_IN",
            checkInAt: now,
            checkedInById: user.id,
          },
          include: {
            room: { include: { roomType: true } },
            guest: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        });

        await tx.room.update({
          where: { id: booking.roomId },
          data: { status: "OCCUPIED" },
        });

        await tx.notification.create({
          data: {
            userId: booking.guestId,
            title: "Welcome to StayHaven!",
            message: `Your check-in is complete. Room ${booking.room.number} is ready.`,
            type: "CHECK_IN_REMINDER",
            bookingId: booking.id,
          },
        });

        return updatedBooking;
      });

      return successResponse(updated, "Check-in successful");
    } catch (error) {
      console.error("Staff check-in error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["STAFF", "MANAGER", "ADMIN"]
);
