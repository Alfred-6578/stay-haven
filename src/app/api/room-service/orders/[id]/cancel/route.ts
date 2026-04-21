import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import { createNotification } from "@/lib/notifications";

export const PATCH = withAuth<{ id: string }>(
  async (
    _request: NextRequest,
    ctx: RouteContext<{ id: string }>,
    user: AuthUser
  ) => {
    try {
      const { id } = await ctx.params;

      const order = await prisma.roomServiceOrder.findUnique({
        where: { id },
        include: {
          booking: { select: { id: true, room: { select: { number: true } } } },
        },
      });
      if (!order) return errorResponse("Order not found", 404);

      const isStaff = ["STAFF", "MANAGER", "ADMIN"].includes(user.role);

      if (!isStaff) {
        if (order.guestId !== user.id) return errorResponse("Forbidden", 403);
        if (order.status !== "PENDING") {
          return errorResponse(
            "You can only cancel orders that haven't started preparing",
            422
          );
        }
      } else {
        if (["DELIVERED", "CANCELLED"].includes(order.status)) {
          return errorResponse(
            `Cannot cancel an order that is already ${order.status}`,
            422
          );
        }
      }

      const updated = await prisma.roomServiceOrder.update({
        where: { id },
        data: { status: "CANCELLED" },
      });

      await createNotification({
        userId: order.guestId,
        title: "Order Cancelled",
        message: isStaff
          ? "Your order has been cancelled. Please contact the front desk."
          : "Your order has been cancelled.",
        type: "ROOM_SERVICE_UPDATE",
        bookingId: order.booking.id,
      });

      return successResponse(updated, "Order cancelled");
    } catch (error) {
      console.error("Order cancel error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
);
