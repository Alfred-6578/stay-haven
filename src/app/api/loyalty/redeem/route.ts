import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import { POINTS_VALUE_NGN } from "@/lib/loyalty";

export const POST = withAuth(
  async (request: NextRequest, _ctx, user: AuthUser) => {
    try {
      const { points, bookingId } = await request.json();

      if (!points || points <= 0) {
        return errorResponse("Points must be greater than 0", 422);
      }
      if (!bookingId) {
        return errorResponse("bookingId is required", 422);
      }

      const guestProfile = await prisma.guestProfile.findUnique({
        where: { userId: user.id },
      });
      if (!guestProfile) {
        return errorResponse("Guest profile not found", 404);
      }
      if (guestProfile.totalPoints < points) {
        return errorResponse("Insufficient points", 422);
      }

      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
      });
      if (!booking) {
        return errorResponse("Booking not found", 404);
      }
      if (booking.guestId !== user.id) {
        return errorResponse("Forbidden", 403);
      }
      if (booking.status !== "PENDING") {
        return errorResponse("Can only redeem points on PENDING bookings", 422);
      }

      // 1 pt = ₦1 (see POINTS_VALUE_NGN in @/lib/loyalty)
      let discount = points * POINTS_VALUE_NGN;
      const maxDiscount = Number(booking.totalAmount);
      if (discount > maxDiscount) {
        discount = maxDiscount;
      }

      const newTotal = Math.max(0, Number(booking.totalAmount) - discount);

      // Update booking
      const updatedBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: {
          discountAmount: discount,
          totalAmount: newTotal,
          pointsUsed: points,
        },
        include: { room: { include: { roomType: true } } },
      });

      // Deduct points (NOT lifetimePoints)
      await prisma.guestProfile.update({
        where: { id: guestProfile.id },
        data: {
          totalPoints: guestProfile.totalPoints - points,
        },
      });

      // Create transaction
      await prisma.loyaltyTransaction.create({
        data: {
          guestId: user.id,
          points: -points,
          type: "REDEEMED",
          description: `Redeemed for booking ${booking.bookingRef}`,
          bookingId: booking.id,
        },
      });

      return successResponse({
        newBalance: guestProfile.totalPoints - points,
        discount,
        updatedBooking,
      });
    } catch (error) {
      console.error("Loyalty redeem error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
);
