import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";

/**
 * GET /api/bookings/[id]/extensions
 * Returns the extension history for a booking (own booking, or staff).
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

      // Schema limits to one extension per booking (unique bookingId),
      // but we return as an array to keep the history shape forward-compatible.
      const extension = await prisma.stayExtension.findUnique({
        where: { bookingId: id },
      });

      return successResponse({
        extensions: extension ? [extension] : [],
      });
    } catch (error) {
      console.error("Get extensions error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
);
