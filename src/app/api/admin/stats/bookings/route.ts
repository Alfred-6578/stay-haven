import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";

const BOOKING_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "CHECKED_IN",
  "CHECKED_OUT",
  "CANCELLED",
  "NO_SHOW",
] as const;

export const GET = withAuth(
  async (_request: NextRequest) => {
    try {
      const [statusCounts, allBookings, completedPaymentsAgg, confirmedBookingsCount] =
        await Promise.all([
          prisma.booking.groupBy({
            by: ["status"],
            _count: { _all: true },
          }),
          prisma.booking.findMany({
            where: { status: { not: "CANCELLED" } },
            select: {
              totalNights: true,
              totalAmount: true,
              status: true,
              room: {
                select: { roomType: { select: { id: true, name: true } } },
              },
            },
          }),
          prisma.payment.aggregate({
            _sum: { amount: true },
            where: { status: "COMPLETED" },
          }),
          prisma.booking.count({
            where: {
              status: { in: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] },
            },
          }),
        ]);

      // Status breakdown
      const statusBreakdown: Record<string, number> = {};
      for (const s of BOOKING_STATUSES) statusBreakdown[s] = 0;
      for (const row of statusCounts) {
        statusBreakdown[row.status] = row._count._all;
      }

      // By room type
      const typeMap = new Map<
        string,
        { roomType: string; count: number; revenue: number }
      >();
      for (const b of allBookings) {
        const key = b.room.roomType.id;
        if (!typeMap.has(key)) {
          typeMap.set(key, { roomType: b.room.roomType.name, count: 0, revenue: 0 });
        }
        const entry = typeMap.get(key)!;
        entry.count += 1;
        entry.revenue += Number(b.totalAmount);
      }
      const byRoomType = Array.from(typeMap.values()).sort(
        (a, b) => b.count - a.count
      );

      // Averages
      const totalRevenue = Number(completedPaymentsAgg._sum.amount || 0);
      const avgBookingValue =
        confirmedBookingsCount > 0 ? totalRevenue / confirmedBookingsCount : 0;

      const checkedOut = allBookings.filter((b) => b.status === "CHECKED_OUT");
      const avgNights =
        checkedOut.length > 0
          ? checkedOut.reduce((sum, b) => sum + b.totalNights, 0) /
            checkedOut.length
          : 0;

      return successResponse({
        statusBreakdown,
        byRoomType,
        avgBookingValue: Number(avgBookingValue.toFixed(2)),
        avgNights: Number(avgNights.toFixed(2)),
      });
    } catch (error) {
      console.error("Admin bookings stats error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["ADMIN", "MANAGER"]
);
