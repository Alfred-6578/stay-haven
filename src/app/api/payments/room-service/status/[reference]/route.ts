import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import { createNotification } from "@/lib/notifications";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

export const GET = withAuth<{ reference: string }>(
  async (
    _request: NextRequest,
    ctx: RouteContext<{ reference: string }>,
    user: AuthUser
  ) => {
    try {
      const { reference } = await ctx.params;

      const pending = await prisma.pendingPayment.findUnique({
        where: { reference },
      });
      if (!pending) return errorResponse("Payment not found", 404);
      if (pending.userId !== user.id) return errorResponse("Forbidden", 403);
      if (pending.type !== "ROOM_SERVICE") {
        return errorResponse("Not a room-service payment", 422);
      }

      const data = pending.data as { bookingId: string; orderIds: string[] };

      // Already settled on a prior verify
      if (pending.status === "completed") {
        return successResponse({ status: "COMPLETED" });
      }
      if (pending.status === "failed") {
        return successResponse({ status: "FAILED" });
      }

      // Verify with Paystack
      const paystackRes = await fetch(
        `https://api.paystack.co/transaction/verify/${reference}`,
        { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } }
      );
      const paystackData = await paystackRes.json();

      if (paystackData.status && paystackData.data?.status === "success") {
        const now = new Date();
        await prisma.$transaction(async (tx) => {
          await tx.roomServiceOrder.updateMany({
            where: {
              id: { in: data.orderIds },
              bookingId: data.bookingId,
              isSettled: false,
            },
            data: {
              isSettled: true,
              settledAt: now,
              settlementMethod: "PAYSTACK",
              settlementReference: reference,
            },
          });
          await tx.pendingPayment.update({
            where: { id: pending.id },
            data: { status: "completed" },
          });
        });

        await createNotification({
          userId: user.id,
          title: "Room Service Bill Paid",
          message: `You've settled ₦${Number(pending.amount).toLocaleString()} for room service.`,
          type: "ROOM_SERVICE_UPDATE",
          bookingId: data.bookingId,
        });

        return successResponse({ status: "COMPLETED" });
      }

      if (paystackData.data?.status === "failed") {
        await prisma.pendingPayment.update({
          where: { id: pending.id },
          data: { status: "failed" },
        });
        return successResponse({ status: "FAILED" });
      }

      return successResponse({ status: "PENDING" });
    } catch (error) {
      console.error("Room service payment status error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
);
