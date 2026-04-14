import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";

export const PATCH = withAuth(
  async (_request: NextRequest, _ctx, user: AuthUser) => {
    try {
      const result = await prisma.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true },
      });

      return successResponse(
        { updated: result.count },
        `${result.count} notification${result.count !== 1 ? "s" : ""} marked as read`
      );
    } catch (error) {
      console.error("Read all notifications error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
);
