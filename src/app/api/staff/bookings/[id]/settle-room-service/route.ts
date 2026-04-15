import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import { createNotification } from "@/lib/notifications";

const settleSchema = z.object({
  method: z.enum(["CASH", "CARD", "BANK_TRANSFER"]),
  reference: z.string().max(100).optional(),
});

export const POST = withAuth<{ id: string }>(
  async (request: NextRequest, ctx: RouteContext<{ id: string }>) => {
    try {
      const { id } = await ctx.params;
      const body = await request.json();
      const parsed = settleSchema.safeParse(body);
      if (!parsed.success) {
        const msg = parsed.error.issues
          .map((i: { message: string }) => i.message)
          .join(", ");
        return errorResponse(msg, 422);
      }
      const { method, reference } = parsed.data;

      const booking = await prisma.booking.findUnique({
        where: { id },
        select: { id: true, guestId: true, status: true, bookingRef: true },
      });
      if (!booking) return errorResponse("Booking not found", 404);

      // Find all unsettled, non-cancelled orders
      const unsettled = await prisma.roomServiceOrder.findMany({
        where: {
          bookingId: id,
          status: { not: "CANCELLED" },
          isSettled: false,
        },
        select: { id: true, totalAmount: true },
      });

      if (unsettled.length === 0) {
        return errorResponse("No outstanding room service balance", 422);
      }

      const total = unsettled.reduce((s, o) => s + Number(o.totalAmount), 0);
      const now = new Date();

      await prisma.$transaction(async (tx) => {
        await tx.roomServiceOrder.updateMany({
          where: { id: { in: unsettled.map((o) => o.id) } },
          data: {
            isSettled: true,
            settledAt: now,
            settlementMethod: method,
            settlementReference: reference || null,
          },
        });
      });

      await createNotification({
        userId: booking.guestId,
        title: "Room Service Bill Settled",
        message: `Your room service bill of ₦${total.toLocaleString()} has been settled via ${method.toLowerCase().replace("_", " ")}.`,
        type: "ROOM_SERVICE_UPDATE",
        bookingId: booking.id,
      });

      return successResponse(
        {
          settledCount: unsettled.length,
          totalSettled: total,
          method,
          reference: reference || null,
          settledAt: now,
        },
        `Settled ₦${total.toLocaleString()} across ${unsettled.length} order(s)`
      );
    } catch (error) {
      console.error("Settle room service error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["STAFF", "MANAGER", "ADMIN"]
);
