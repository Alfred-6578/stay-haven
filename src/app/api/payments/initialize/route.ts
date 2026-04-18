import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import { POINTS_VALUE_NGN } from "@/lib/loyalty";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

export const POST = withAuth(
  async (request: NextRequest, _ctx, user: AuthUser) => {
    try {
      const { bookingId, pointsUsed } = await request.json();

      if (!bookingId) {
        return errorResponse("bookingId is required", 422);
      }

      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { guest: { select: { email: true } } },
      });

      if (!booking) {
        return errorResponse("Booking not found", 404);
      }
      if (booking.guestId !== user.id) {
        return errorResponse("Forbidden", 403);
      }
      if (booking.status !== "PENDING") {
        return errorResponse("Booking is not in PENDING state", 422);
      }

      // Calculate discount from points (1 pt = ₦POINTS_VALUE_NGN)
      let discount = 0;
      if (pointsUsed && pointsUsed > 0) {
        discount = pointsUsed * POINTS_VALUE_NGN;
      }

      const amount = Math.max(0, Number(booking.totalAmount) - discount);
      const amountInKobo = Math.round(amount * 100); // Paystack uses kobo

      // Update booking with points used
      if (pointsUsed > 0) {
        await prisma.booking.update({
          where: { id: bookingId },
          data: {
            pointsUsed,
            discountAmount: discount,
          },
        });
      }

      // Reuse existing PENDING payment or create new
      let reference: string;
      const existingPayment = await prisma.payment.findFirst({
        where: { bookingId, status: "PENDING" },
      });

      if (existingPayment) {
        reference = existingPayment.reference;
      } else {
        reference = `PAY-${booking.bookingRef}-${Date.now()}`;
        await prisma.payment.create({
          data: {
            bookingId,
            reference,
            amount,
            type: "BOOKING",
            status: "PENDING",
          },
        });
      }

      // Initialize with Paystack
      const paystackRes = await fetch(
        "https://api.paystack.co/transaction/initialize",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: booking.guest.email,
            amount: amountInKobo,
            reference,
            callback_url: `${process.env.CLIENT_URL}/book/confirmed?bookingId=${bookingId}`,
            metadata: {
              bookingId,
              bookingRef: booking.bookingRef,
            },
          }),
        }
      );

      const paystackData = await paystackRes.json();

      if (!paystackData.status) {
        return errorResponse(
          paystackData.message || "Failed to initialize payment",
          500
        );
      }

      return successResponse({
        authorizationUrl: paystackData.data.authorization_url,
        reference: paystackData.data.reference,
        accessCode: paystackData.data.access_code,
      });
    } catch (error) {
      console.error("Payment initialize error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
);
