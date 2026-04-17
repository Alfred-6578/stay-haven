import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";

// GET — single service booking (own or staff)
export const GET = withAuth<{ id: string }>(
  async (
    _request: NextRequest,
    ctx: RouteContext<{ id: string }>,
    user: AuthUser
  ) => {
    try {
      const { id } = await ctx.params;
      const isStaff = ["STAFF", "MANAGER", "ADMIN"].includes(user.role);

      const sb = await prisma.serviceBooking.findUnique({
        where: { id },
        include: {
          service: true,
          booking: {
            select: {
              bookingRef: true,
              room: {
                select: {
                  number: true,
                  roomType: { select: { name: true } },
                },
              },
            },
          },
          guest: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      });

      if (!sb) return errorResponse("Service booking not found", 404);
      if (!isStaff && sb.guestId !== user.id) {
        return errorResponse("Forbidden", 403);
      }

      return successResponse(sb);
    } catch (error) {
      console.error("Get service booking error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
);

// DELETE — guest: own PENDING only (>24h before scheduled), staff: any
export const DELETE = withAuth<{ id: string }>(
  async (
    _request: NextRequest,
    ctx: RouteContext<{ id: string }>,
    user: AuthUser
  ) => {
    try {
      const { id } = await ctx.params;
      const isStaff = ["STAFF", "MANAGER", "ADMIN"].includes(user.role);

      const sb = await prisma.serviceBooking.findUnique({
        where: { id },
        select: {
          id: true,
          guestId: true,
          status: true,
          scheduledAt: true,
        },
      });
      if (!sb) return errorResponse("Service booking not found", 404);

      if (!isStaff) {
        if (sb.guestId !== user.id) {
          return errorResponse("Forbidden", 403);
        }
        if (sb.status !== "PENDING") {
          return errorResponse(
            "Only PENDING requests can be cancelled",
            422
          );
        }
        const hoursUntil =
          (new Date(sb.scheduledAt).getTime() - Date.now()) / (1000 * 60 * 60);
        if (hoursUntil < 24) {
          return errorResponse(
            "Cannot cancel within 24 hours of the scheduled time",
            422
          );
        }
      }

      await prisma.serviceBooking.delete({ where: { id } });

      return successResponse(null, "Service booking cancelled");
    } catch (error) {
      console.error("Delete service booking error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
);
