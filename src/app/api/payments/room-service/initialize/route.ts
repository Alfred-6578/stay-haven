import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import { getRoomServiceBalance } from "@/lib/roomServiceBalance";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

export const POST = withAuth(
  async (request: NextRequest, _ctx, user: AuthUser) => {
    try {
      const { bookingId } = await request.json();
      if (!bookingId) return errorResponse("bookingId is required", 422);

      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: {
          id: true,
          guestId: true,
          bookingRef: true,
          guest: { select: { email: true } },
        },
      });
      if (!booking) return errorResponse("Booking not found", 404);
      if (booking.guestId !== user.id) return errorResponse("Forbidden", 403);

      const balance = await getRoomServiceBalance(booking.id);
      if (balance.unsettledTotal <= 0) {
        return errorResponse("No outstanding balance to settle", 422);
      }

      const orderIds = balance.unsettledOrders.map((o) => o.id);
      const amount = balance.unsettledTotal;
      const amountInKobo = Math.round(amount * 100);

      // Reuse an in-flight pending payment if one exists for the same set of orders
      let reference: string | undefined;
      const existing = await prisma.pendingPayment.findFirst({
        where: {
          userId: user.id,
          type: "ROOM_SERVICE",
          status: "pending",
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });
      if (existing) {
        const data = existing.data as { bookingId?: string; orderIds?: string[] } | null;
        if (
          data &&
          data.bookingId === bookingId &&
          data.orderIds &&
          data.orderIds.length === orderIds.length &&
          data.orderIds.every((id: string) => orderIds.includes(id))
        ) {
          reference = existing.reference;
        }
      }

      if (!reference) {
        reference = `RS-${booking.bookingRef}-${Date.now()}`;
        await prisma.pendingPayment.create({
          data: {
            reference,
            userId: user.id,
            type: "ROOM_SERVICE",
            data: { bookingId, orderIds },
            amount,
            status: "pending",
            expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min window
          },
        });
      }

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
            callback_url: `${process.env.CLIENT_URL}/payment/close`,
            metadata: {
              type: "ROOM_SERVICE",
              bookingId,
              bookingRef: booking.bookingRef,
              orderCount: orderIds.length,
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
        amount,
        orderCount: orderIds.length,
      });
    } catch (error) {
      console.error("Room service payment init error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
);
