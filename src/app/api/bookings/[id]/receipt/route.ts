import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import { calculateBookingPrice } from "@/lib/bookingUtils";

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
          guest: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          payment: true,
        },
      });

      if (!booking) {
        return errorResponse("Booking not found", 404);
      }

      const isStaff = ["ADMIN", "MANAGER", "STAFF"].includes(user.role);
      if (!isStaff && booking.guestId !== user.id) {
        return errorResponse("Forbidden", 403);
      }

      // Recalculate night breakdown for receipt
      const pricing = calculateBookingPrice(
        booking.room.roomType,
        booking.checkIn,
        booking.checkOut
      );

      return successResponse({
        booking: {
          bookingRef: booking.bookingRef,
          status: booking.status,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          adults: booking.adults,
          children: booking.children,
          specialRequests: booking.specialRequests,
          createdAt: booking.createdAt,
        },
        guest: booking.guest,
        room: {
          number: booking.room.number,
          floor: booking.room.floor,
        },
        roomType: {
          name: booking.room.roomType.name,
          slug: booking.room.roomType.slug,
        },
        payment: booking.payment
          ? {
              reference: booking.payment.reference,
              status: booking.payment.status,
              amount: booking.payment.amount,
              currency: booking.payment.currency,
            }
          : null,
        pricing: {
          nightBreakdown: pricing.nightBreakdown,
          baseAmount: pricing.baseAmount,
          taxRate: "10%",
          taxAmount: pricing.taxAmount,
          totalAmount: pricing.totalAmount,
          totalNights: pricing.totalNights,
        },
      });
    } catch (error) {
      console.error("Booking receipt error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
);
