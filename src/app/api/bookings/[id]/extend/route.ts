import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import { calculateBookingPrice } from "@/lib/bookingUtils";
import { createNotification, notifyRoles } from "@/lib/notifications";

/**
 * POST /api/bookings/[id]/extend
 * Guest submits an extension request. Admin must approve before a payment
 * link is generated; the guest then pays via /extend/pay-link.
 */
export const POST = withAuth<{ id: string }>(
  async (
    request: NextRequest,
    ctx: RouteContext<{ id: string }>,
    user: AuthUser
  ) => {
    try {
      const { id } = await ctx.params;
      const { newCheckOut: newCheckOutParam } = (await request.json()) as {
        newCheckOut?: string;
      };

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
      if (booking.guestId !== user.id) {
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

      const existing = await prisma.stayExtension.findUnique({
        where: { bookingId: id },
      });
      if (existing && existing.status === "PENDING") {
        return errorResponse(
          "You already have a pending extension for this booking",
          422
        );
      }

      // Conflict check for the extra window
      const conflicting = await prisma.booking.findFirst({
        where: {
          roomId: booking.roomId,
          id: { not: booking.id },
          status: { in: ["CONFIRMED", "CHECKED_IN", "PENDING"] },
          checkIn: { lt: newCheckOut },
          checkOut: { gt: booking.checkOut },
        },
        select: { id: true },
      });
      if (conflicting) {
        return errorResponse(
          "Your room is not available for the requested dates",
          409
        );
      }

      const msPerDay = 24 * 60 * 60 * 1000;
      const additionalNights = Math.round(
        (newCheckOut.getTime() - booking.checkOut.getTime()) / msPerDay
      );

      const { baseAmount } = calculateBookingPrice(
        booking.room.roomType,
        booking.checkOut,
        newCheckOut
      );

      // Replace any prior (REJECTED/APPROVED) extension since bookingId is unique.
      const extension = existing
        ? await prisma.stayExtension.update({
            where: { bookingId: id },
            data: {
              originalCheckOut: booking.checkOut,
              newCheckOut,
              additionalNights,
              additionalAmount: baseAmount,
              paymentReference: null,
              status: "PENDING",
            },
          })
        : await prisma.stayExtension.create({
            data: {
              bookingId: id,
              originalCheckOut: booking.checkOut,
              newCheckOut,
              additionalNights,
              additionalAmount: baseAmount,
              status: "PENDING",
            },
          });

      await createNotification({
        userId: user.id,
        title: "Extension Requested",
        message: `Your request to extend by ${additionalNights} night${additionalNights === 1 ? "" : "s"} is under review.`,
        type: "GENERAL",
        bookingId: booking.id,
      });

      // Await so the insert completes before the response returns —
      // fire-and-forget gets cut off on serverless runtimes.
      try {
        await notifyRoles(["ADMIN", "MANAGER"], {
          title: "Extension Request Pending",
          message: `New extension request on ${booking.bookingRef} (+${additionalNights} night${additionalNights === 1 ? "" : "s"}) needs review.`,
          type: "GENERAL",
          bookingId: booking.id,
        });
      } catch (e) {
        console.error("notifyRoles (extension) failed:", e);
      }

      return successResponse(extension, "Extension request submitted", 201);
    } catch (error) {
      console.error("Extend booking error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
);
