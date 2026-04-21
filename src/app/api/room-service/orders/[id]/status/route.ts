import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import { createNotification } from "@/lib/notifications";

const STAFF_STATUSES = ["PREPARING", "DELIVERED", "CANCELLED"] as const;

const schema = z.object({
  status: z.enum(STAFF_STATUSES),
});

type TargetStatus = (typeof STAFF_STATUSES)[number];

const ALLOWED_TRANSITIONS: Record<string, TargetStatus[]> = {
  PENDING: ["PREPARING", "CANCELLED"],
  PREPARING: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

export const PATCH = withAuth<{ id: string }>(
  async (request: NextRequest, ctx: RouteContext<{ id: string }>) => {
    try {
      const { id } = await ctx.params;
      const body = await request.json();
      const parsed = schema.safeParse(body);
      if (!parsed.success) {
        const msg = parsed.error.issues
          .map((i: { message: string }) => i.message)
          .join(", ");
        return errorResponse(msg, 422);
      }

      const { status } = parsed.data;

      const order = await prisma.roomServiceOrder.findUnique({
        where: { id },
        include: {
          booking: { select: { id: true, room: { select: { number: true } } } },
        },
      });
      if (!order) return errorResponse("Order not found", 404);

      const allowed = ALLOWED_TRANSITIONS[order.status] || [];
      if (!allowed.includes(status)) {
        return errorResponse(
          `Cannot transition from ${order.status} to ${status}`,
          422
        );
      }

      const updated = await prisma.roomServiceOrder.update({
        where: { id },
        data: {
          status,
          deliveredAt: status === "DELIVERED" ? new Date() : undefined,
        },
      });

      const roomNumber = order.booking.room.number;
      const messages: Record<TargetStatus, { title: string; message: string }> = {
        PREPARING: {
          title: "Order in Progress",
          message: "Your order is being prepared in the kitchen.",
        },
        DELIVERED: {
          title: "Order Delivered",
          message: `Your order has been delivered to room ${roomNumber}. Enjoy!`,
        },
        CANCELLED: {
          title: "Order Cancelled",
          message:
            "Your order has been cancelled. Please contact the front desk.",
        },
      };

      const { title, message } = messages[status];
      await createNotification({
        userId: order.guestId,
        title,
        message,
        type: "ROOM_SERVICE_UPDATE",
        bookingId: order.booking.id,
      });

      return successResponse(updated, `Order marked as ${status}`);
    } catch (error) {
      console.error("Order status error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["STAFF", "MANAGER", "ADMIN"]
);
