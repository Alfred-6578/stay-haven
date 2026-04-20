import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import { createNotification } from "@/lib/notifications";

export const PATCH = withAuth<{ id: string }>(
  async (_request: NextRequest, ctx: RouteContext<{ id: string }>) => {
    try {
      const { id } = await ctx.params;

      const extension = await prisma.stayExtension.findUnique({
        where: { id },
        include: {
          booking: { select: { id: true, guestId: true } },
        },
      });
      if (!extension) return errorResponse("Extension not found", 404);
      if (extension.status !== "PENDING") {
        return errorResponse(
          `Cannot reject a ${extension.status} extension`,
          422
        );
      }

      await prisma.stayExtension.update({
        where: { id },
        data: { status: "REJECTED" },
      });

      await createNotification({
        userId: extension.booking.guestId,
        title: "Extension Declined",
        message:
          "Your extension request was declined. Please contact the front desk.",
        type: "GENERAL",
        bookingId: extension.booking.id,
      });

      return successResponse({ id, status: "REJECTED" }, "Extension rejected");
    } catch (error) {
      console.error("Admin reject extension error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["ADMIN", "MANAGER"]
);
