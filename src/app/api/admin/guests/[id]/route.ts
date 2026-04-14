import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import { getNextTier, getTierProgress } from "@/lib/loyalty";

export const GET = withAuth<{ id: string }>(
  async (_request: NextRequest, ctx: RouteContext<{ id: string }>) => {
    try {
      const { id } = await ctx.params;

      const user = await prisma.user.findFirst({
        where: { id, role: "GUEST", isDeleted: false },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          avatar: true,
          createdAt: true,
          guestProfile: true,
          bookings: {
            orderBy: { createdAt: "desc" },
            include: {
              room: {
                select: {
                  number: true,
                  floor: true,
                  roomType: { select: { name: true } },
                },
              },
              payment: {
                select: {
                  reference: true,
                  amount: true,
                  status: true,
                  type: true,
                  createdAt: true,
                },
              },
            },
          },
          loyaltyTransactions: {
            orderBy: { createdAt: "desc" },
            take: 20,
            select: {
              id: true,
              points: true,
              type: true,
              description: true,
              bookingId: true,
              createdAt: true,
            },
          },
          notifications: {
            orderBy: { createdAt: "desc" },
            take: 10,
            select: {
              id: true,
              title: true,
              message: true,
              type: true,
              isRead: true,
              bookingId: true,
              createdAt: true,
            },
          },
        },
      });

      if (!user) {
        return errorResponse("Guest not found", 404);
      }

      const tier = user.guestProfile?.loyaltyTier || "BRONZE";
      const lifetimePoints = user.guestProfile?.lifetimePoints || 0;
      const totalPoints = user.guestProfile?.totalPoints || 0;

      return successResponse({
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          createdAt: user.createdAt,
        },
        guestProfile: user.guestProfile,
        bookings: user.bookings,
        loyaltyTransactions: user.loyaltyTransactions,
        notifications: user.notifications,
        loyalty: {
          tier,
          totalPoints,
          lifetimePoints,
          tierProgress: getTierProgress(tier, lifetimePoints),
          nextTier: getNextTier(tier, lifetimePoints),
        },
      });
    } catch (error) {
      console.error("Admin guest detail error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["ADMIN", "MANAGER"]
);
