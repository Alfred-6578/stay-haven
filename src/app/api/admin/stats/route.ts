import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";

export const GET = withAuth(
  async (_request: NextRequest) => {
    try {
      const now = new Date();
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      const [
        totalRevenueAgg,
        totalBookings,
        totalGuests,
        totalRooms,
        todayRevenueAgg,
        todayCheckIns,
        todayCheckOuts,
        newBookingsToday,
        monthRevenueAgg,
        monthBookings,
        occupiedRooms,
        recentBookingsRaw,
        recentGuestsRaw,
      ] = await Promise.all([
        prisma.payment.aggregate({
          _sum: { amount: true },
          where: { status: "COMPLETED" },
        }),
        prisma.booking.count({ where: { status: { not: "CANCELLED" } } }),
        prisma.user.count({ where: { role: "GUEST", isDeleted: false } }),
        prisma.room.count({ where: { isActive: true } }),
        prisma.payment.aggregate({
          _sum: { amount: true },
          where: {
            status: "COMPLETED",
            updatedAt: { gte: todayStart, lte: todayEnd },
          },
        }),
        prisma.booking.count({
          where: {
            status: { in: ["CONFIRMED", "CHECKED_IN"] },
            checkIn: { gte: todayStart, lte: todayEnd },
          },
        }),
        prisma.booking.count({
          where: {
            status: { in: ["CHECKED_IN", "CHECKED_OUT"] },
            checkOut: { gte: todayStart, lte: todayEnd },
          },
        }),
        prisma.booking.count({
          where: { createdAt: { gte: todayStart, lte: todayEnd } },
        }),
        prisma.payment.aggregate({
          _sum: { amount: true },
          where: {
            status: "COMPLETED",
            updatedAt: { gte: monthStart, lte: monthEnd },
          },
        }),
        prisma.booking.count({
          where: {
            createdAt: { gte: monthStart, lte: monthEnd },
            status: { not: "CANCELLED" },
          },
        }),
        prisma.room.count({
          where: { isActive: true, status: "OCCUPIED" },
        }),
        prisma.booking.findMany({
          orderBy: { createdAt: "desc" },
          take: 8,
          include: {
            guest: { select: { firstName: true, lastName: true } },
            room: {
              select: {
                number: true,
                roomType: { select: { name: true } },
              },
            },
          },
        }),
        prisma.user.findMany({
          where: { role: "GUEST", isDeleted: false },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
            createdAt: true,
            guestProfile: { select: { loyaltyTier: true } },
          },
        }),
      ]);

      const currentOccupancyRate =
        totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

      return successResponse({
        overview: {
          totalRevenue: Number(totalRevenueAgg._sum.amount || 0),
          totalBookings,
          totalGuests,
          totalRooms,
        },
        today: {
          todayRevenue: Number(todayRevenueAgg._sum.amount || 0),
          todayCheckIns,
          todayCheckOuts,
          newBookingsToday,
        },
        thisMonth: {
          monthRevenue: Number(monthRevenueAgg._sum.amount || 0),
          monthBookings,
          currentOccupancyRate: Number(currentOccupancyRate.toFixed(2)),
          occupiedRooms,
          totalRooms,
        },
        recent: {
          recentBookings: recentBookingsRaw.map((b) => ({
            id: b.id,
            bookingRef: b.bookingRef,
            guestName: `${b.guest.firstName} ${b.guest.lastName}`,
            roomNumber: b.room.number,
            roomType: b.room.roomType.name,
            amount: Number(b.totalAmount),
            status: b.status,
            createdAt: b.createdAt,
          })),
          recentGuests: recentGuestsRaw,
        },
      });
    } catch (error) {
      console.error("Admin stats error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["ADMIN", "MANAGER"]
);
