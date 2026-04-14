import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";

// GET — booking detail
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
          notifications: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
          roomServiceOrders: {
            orderBy: { createdAt: "desc" },
          },
          serviceBookings: {
            include: { service: true },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!booking) {
        return errorResponse("Booking not found", 404);
      }

      // Guests can only view their own
      const isStaff = ["ADMIN", "MANAGER", "STAFF"].includes(user.role);
      if (!isStaff && booking.guestId !== user.id) {
        return errorResponse("Forbidden", 403);
      }

      return successResponse(booking);
    } catch (error) {
      console.error("Get booking error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
);
