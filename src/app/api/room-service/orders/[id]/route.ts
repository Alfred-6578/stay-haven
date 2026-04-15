import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";

interface OrderItemLine {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export const GET = withAuth<{ id: string }>(
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
          booking: {
            select: {
              bookingRef: true,
              room: { select: { number: true, floor: true } },
            },
          },
          guest: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
      });

      if (!order) return errorResponse("Order not found", 404);

      const isStaff = ["STAFF", "MANAGER", "ADMIN"].includes(user.role);
      if (!isStaff && order.guestId !== user.id) {
        return errorResponse("Forbidden", 403);
      }

      return successResponse({
        id: order.id,
        status: order.status,
        totalAmount: Number(order.totalAmount),
        items: order.items as unknown as OrderItemLine[],
        instructions: order.instructions,
        estimatedAt: order.estimatedAt,
        deliveredAt: order.deliveredAt,
        createdAt: order.createdAt,
        booking: {
          bookingRef: order.booking.bookingRef,
          roomNumber: order.booking.room.number,
          floor: order.booking.room.floor,
        },
        guest: {
          id: order.guest.id,
          name: `${order.guest.firstName} ${order.guest.lastName}`,
          email: order.guest.email,
          phone: order.guest.phone,
        },
      });
    } catch (error) {
      console.error("Order detail error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
);
