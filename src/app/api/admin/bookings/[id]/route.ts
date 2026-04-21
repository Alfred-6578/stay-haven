import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";

export const PATCH = withAuth<{ id: string }>(
  async (request: NextRequest, ctx: RouteContext<{ id: string }>) => {
    try {
      const { id } = await ctx.params;
      const body = await request.json();

      const booking = await prisma.booking.findUnique({ where: { id } });
      if (!booking) {
        return errorResponse("Booking not found", 404);
      }

      const updateData: Record<string, unknown> = {};

      // Only allow specific fields
      if (body.specialRequests !== undefined) {
        updateData.specialRequests = body.specialRequests;
      }

      if (body.status) {
        if (!["CONFIRMED", "NO_SHOW"].includes(body.status)) {
          return errorResponse(
            "Admin can only set status to CONFIRMED or NO_SHOW via this route",
            422
          );
        }
        updateData.status = body.status;

        // If confirming, create notification
        if (body.status === "CONFIRMED") {
          await prisma.notification.create({
            data: {
              userId: booking.guestId,
              title: "Booking Confirmed",
              message: `Your booking ${booking.bookingRef} has been confirmed.`,
              type: "BOOKING_CONFIRMED",
              bookingId: booking.id,
            },
          });
        }
      }

      const updated = await prisma.booking.update({
        where: { id },
        data: updateData,
        include: {
          room: { include: { roomType: true } },
          guest: {
            select: { firstName: true, lastName: true, email: true },
          },
          payment: true,
        },
      });

      return successResponse(updated, "Booking updated");
    } catch (error) {
      console.error("Admin update booking error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["ADMIN"]
);
