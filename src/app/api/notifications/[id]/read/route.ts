import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";

export const PATCH = withAuth<{ id: string }>(
  async (
    _request: NextRequest,
    ctx: RouteContext<{ id: string }>,
    user: AuthUser
  ) => {
    try {
      const { id } = await ctx.params;

      const notification = await prisma.notification.findUnique({
        where: { id },
      });

      if (!notification) {
        return errorResponse("Notification not found", 404);
      }
      if (notification.userId !== user.id) {
        return errorResponse("Forbidden", 403);
      }

      await prisma.notification.update({
        where: { id },
        data: { isRead: true },
      });

      return successResponse(null, "Marked as read");
    } catch (error) {
      console.error("Read notification error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
);
