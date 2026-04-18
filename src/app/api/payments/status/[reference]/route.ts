import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import { bookingConfirmationEmail } from "@/lib/email";
import { calculatePointsEarned } from "@/lib/loyalty";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

export const GET = withAuth<{ reference: string }>(
  async (
    _request: NextRequest,
    ctx: RouteContext<{ reference: string }>
  ) => {
    try {
      const { reference } = await ctx.params;

      const payment = await prisma.payment.findUnique({
        where: { reference },
        include: {
          booking: {
            include: {
              guest: { select: { firstName: true, email: true } },
              room: { include: { roomType: { select: { name: true } } } },
            },
          },
        },
      });

      if (!payment) {
        return errorResponse("Payment not found", 404);
      }

      // Already completed
      if (payment.status === "COMPLETED") {
        return successResponse({ status: "COMPLETED", payment });
      }

      // Verify with Paystack
      const paystackRes = await fetch(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
        }
      );
      const paystackData = await paystackRes.json();

      if (
        paystackData.status &&
        paystackData.data.status === "success"
      ) {
        // Update payment
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "COMPLETED",
            paystackData: paystackData.data,
          },
        });

        // Confirm booking
        if (payment.booking) {
          await prisma.booking.update({
            where: { id: payment.booking.id },
            data: { status: "CONFIRMED" },
          });

          // Deduct loyalty points if used
          if (payment.booking.pointsUsed > 0) {
            const guestProfile = await prisma.guestProfile.findUnique({
              where: { userId: payment.booking.guestId },
            });
            if (guestProfile) {
              await prisma.guestProfile.update({
                where: { id: guestProfile.id },
                data: {
                  totalPoints: Math.max(
                    0,
                    guestProfile.totalPoints - payment.booking.pointsUsed
                  ),
                },
              });

              await prisma.loyaltyTransaction.create({
                data: {
                  guestId: payment.booking.guestId,
                  points: -payment.booking.pointsUsed,
                  type: "REDEEMED",
                  description: `Redeemed for booking ${payment.booking.bookingRef}`,
                  bookingId: payment.booking.id,
                },
              });
            }
          }

          // Earn points (tier-based: 3–5% effective return)
          const guestProfile = await prisma.guestProfile.findUnique({
            where: { userId: payment.booking.guestId },
          });
          const pointsEarned = calculatePointsEarned(
            Number(payment.amount),
            guestProfile?.loyaltyTier || "BRONZE"
          );
          if (pointsEarned > 0 && guestProfile) {
              await prisma.guestProfile.update({
                where: { id: guestProfile.id },
                data: {
                  totalPoints: guestProfile.totalPoints + pointsEarned,
                  lifetimePoints: guestProfile.lifetimePoints + pointsEarned,
                },
              });

              await prisma.loyaltyTransaction.create({
                data: {
                  guestId: payment.booking.guestId,
                  points: pointsEarned,
                  type: "EARNED",
                  description: `Earned from booking ${payment.booking.bookingRef}`,
                  bookingId: payment.booking.id,
                },
              });
          }

          // Notification
          await prisma.notification.create({
            data: {
              userId: payment.booking.guestId,
              title: "Booking Confirmed",
              message: `Your booking ${payment.booking.bookingRef} has been confirmed. Welcome to StayHaven!`,
              type: "BOOKING_CONFIRMED",
              bookingId: payment.booking.id,
            },
          });

          // Email
          if (payment.booking.guest && payment.booking.room) {
            bookingConfirmationEmail(
              {
                firstName: payment.booking.guest.firstName,
                email: payment.booking.guest.email,
              },
              {
                bookingRef: payment.booking.bookingRef,
                checkIn: payment.booking.checkIn,
                checkOut: payment.booking.checkOut,
                totalAmount: Number(payment.amount),
              },
              payment.booking.room.roomType.name
            );
          }
        }

        return successResponse({ status: "COMPLETED" });
      }

      if (
        paystackData.data &&
        paystackData.data.status === "failed"
      ) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "FAILED", paystackData: paystackData.data },
        });
        return successResponse({ status: "FAILED" });
      }

      return successResponse({ status: "PENDING" });
    } catch (error) {
      console.error("Payment status error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
);
