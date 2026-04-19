import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";

/**
 * GET /api/bookings/[id]/upgrade
 * Returns the current upgrade request for a booking (own or staff).
 */
export const GET = withAuth<{ id: string }>(
  async (
    _request: NextRequest,
    ctx: RouteContext<{ id: string }>,
    user: AuthUser
  ) => {
    try {
      const { id } = await ctx.params;
      const isStaff = ["STAFF", "MANAGER", "ADMIN"].includes(user.role);

      const booking = await prisma.booking.findUnique({
        where: { id },
        select: { id: true, guestId: true },
      });
      if (!booking) return errorResponse("Booking not found", 404);
      if (!isStaff && booking.guestId !== user.id) {
        return errorResponse("Forbidden", 403);
      }

      const upgrade = await prisma.roomUpgradeRequest.findUnique({
        where: { bookingId: id },
        include: {
          requestedType: {
            select: {
              id: true,
              name: true,
              image: true,
              images: true,
              basePrice: true,
              capacity: true,
              amenities: true,
            },
          },
          currentRoom: {
            select: {
              number: true,
              roomType: { select: { name: true } },
            },
          },
          processedBy: {
            select: { firstName: true, lastName: true },
          },
        },
      });

      return successResponse(upgrade);
    } catch (error) {
      console.error("Get upgrade error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
);
