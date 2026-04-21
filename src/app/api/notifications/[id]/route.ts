import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";

export const DELETE = withAuth<{ id: string }>(
  async (
    _request: NextRequest,
    ctx: RouteContext<{ id: string }>,
    user: AuthUser
  ) => {
    try {
      const { id } = await ctx.params;

      const notification = await prisma.notification.findUnique({
        where: { id },
        select: { id: true, userId: true },
      });

      if (!notification) {
        return errorResponse("Notification not found", 404);
      }
      if (notification.userId !== user.id) {
        return errorResponse("Forbidden", 403);
      }

      await prisma.notification.delete({ where: { id } });

      return successResponse(null, "Notification deleted");
    } catch (error) {
      console.error("Delete notification error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
);
