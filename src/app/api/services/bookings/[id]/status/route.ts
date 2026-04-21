import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import { createNotification } from "@/lib/notifications";

export const PATCH = withAuth<{ id: string }>(
  async (
    request: NextRequest,
    ctx: RouteContext<{ id: string }>,
    _user: AuthUser
  ) => {
    try {
      const { id } = await ctx.params;
      const { status, notes } = (await request.json()) as {
        status?: string;
        notes?: string;
      };

      if (!status || !["APPROVED", "REJECTED"].includes(status)) {
        return errorResponse("status must be APPROVED or REJECTED", 422);
      }

      const sb = await prisma.serviceBooking.findUnique({
        where: { id },
        include: {
          service: { select: { name: true } },
        },
      });
      if (!sb) return errorResponse("Service booking not found", 404);

      if (sb.status !== "PENDING") {
        return errorResponse(
          `Cannot change status of a ${sb.status} request`,
          422
        );
      }

      const updated = await prisma.serviceBooking.update({
        where: { id },
        data: {
          status: status as "APPROVED" | "REJECTED",
          ...(notes !== undefined ? { notes: notes?.trim() || sb.notes } : {}),
        },
        include: {
          service: { select: { name: true, category: true } },
          booking: {
            select: {
              bookingRef: true,
              room: {
                select: { number: true },
              },
            },
          },
        },
      });

      const dateStr = new Date(sb.scheduledAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const timeStr = new Date(sb.scheduledAt).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });

      if (status === "APPROVED") {
        await createNotification({
          userId: sb.guestId,
          title: "Service Confirmed",
          message: `Your ${sb.service.name} on ${dateStr} at ${timeStr} is confirmed!`,
          type: "GENERAL",
          bookingId: sb.bookingId,
        });
      } else {
        await createNotification({
          userId: sb.guestId,
          title: "Service Unavailable",
          message: `Your ${sb.service.name} request was unavailable. Contact the front desk for alternatives.`,
          type: "GENERAL",
          bookingId: sb.bookingId,
        });
      }

      return successResponse(updated, `Service request ${status.toLowerCase()}`);
    } catch (error) {
      console.error("Update service booking status error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["STAFF", "MANAGER", "ADMIN"]
);
