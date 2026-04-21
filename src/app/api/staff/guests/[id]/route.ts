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
              payment: { select: { status: true, amount: true } },
            },
          },
          roomServiceOrders: {
            orderBy: { createdAt: "desc" },
            take: 20,
            select: {
              id: true,
              status: true,
              totalAmount: true,
              createdAt: true,
              deliveredAt: true,
            },
          },
          loyaltyTransactions: {
            orderBy: { createdAt: "desc" },
            take: 20,
          },
        },
      });

      if (!user) {
        return errorResponse("Guest not found", 404);
      }

      const tier = user.guestProfile?.loyaltyTier || "BRONZE";
      const totalPoints = user.guestProfile?.totalPoints || 0;
      const lifetimePoints = user.guestProfile?.lifetimePoints || 0;
      const nextTier = getNextTier(tier, lifetimePoints);
      const tierProgress = getTierProgress(tier, lifetimePoints);

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
        roomServiceOrders: user.roomServiceOrders,
        loyalty: {
          tier,
          totalPoints,
          lifetimePoints: user.guestProfile?.lifetimePoints || 0,
          totalStays: user.guestProfile?.totalStays || 0,
          tierProgress,
          nextTier,
          transactions: user.loyaltyTransactions,
        },
      });
    } catch (error) {
      console.error("Staff guest detail error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["STAFF", "MANAGER", "ADMIN"]
);
