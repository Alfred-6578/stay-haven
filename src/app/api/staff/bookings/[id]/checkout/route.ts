import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";

export const POST = withAuth<{ id: string }>(
  async (request: NextRequest, ctx: RouteContext<{ id: string }>) => {
    try {
      const { id } = await ctx.params;
      const { searchParams } = new URL(request.url);
      const force = searchParams.get("force") === "true";

      const booking = await prisma.booking.findUnique({
        where: { id },
        include: {
          room: true,
          roomServiceOrders: {
            where: { status: { not: "DELIVERED" } },
            select: { id: true, status: true },
          },
        },
      });

      if (!booking) {
        return errorResponse("Booking not found", 404);
      }

      if (booking.status !== "CHECKED_IN") {
        return errorResponse(
          `Cannot check out a booking with status ${booking.status}`,
          422
        );
      }

      if (booking.roomServiceOrders.length > 0 && !force) {
        return errorResponse(
          `There are ${booking.roomServiceOrders.length} pending room service order(s). Use ?force=true to override.`,
          409
        );
      }

      const now = new Date();

      const updated = await prisma.$transaction(async (tx) => {
        const updatedBooking = await tx.booking.update({
          where: { id },
          data: {
            status: "CHECKED_OUT",
            checkOutAt: now,
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
          data: { status: "CLEANING" },
        });

        await tx.guestProfile.update({
          where: { userId: booking.guestId },
          data: { totalStays: { increment: 1 } },
        });

        await tx.notification.create({
          data: {
            userId: booking.guestId,
            title: "Thank you for staying!",
            message: "We hope to see you again soon.",
            type: "GENERAL",
            bookingId: booking.id,
          },
        });

        return updatedBooking;
      });

      return successResponse(updated, "Check-out successful");
    } catch (error) {
      console.error("Staff check-out error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["STAFF", "MANAGER", "ADMIN"]
);
