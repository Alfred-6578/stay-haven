import { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";

export const GET = withAuth(
  async (request: NextRequest, _ctx, user: AuthUser) => {
    try {
      const { searchParams } = new URL(request.url);
      const isReadParam = searchParams.get("isRead");
      const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
      const limit = Math.min(
        50,
        Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
      );

      const where: Prisma.NotificationWhereInput = { userId: user.id };
      if (isReadParam !== null) {
        where.isRead = isReadParam === "true";
      }

      const [total, notifications, unreadCount] = await Promise.all([
        prisma.notification.count({ where }),
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.notification.count({
          where: { userId: user.id, isRead: false },
        }),
      ]);

      return successResponse({
        notifications,
        unreadCount,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Notifications error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
);
