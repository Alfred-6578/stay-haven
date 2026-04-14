import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import {
  format,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  subDays,
} from "date-fns";

export const GET = withAuth(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const startParam = searchParams.get("startDate");
      const endParam = searchParams.get("endDate");

      const now = new Date();
      const end = endParam ? endOfDay(new Date(endParam)) : endOfDay(now);
      const start = startParam
        ? startOfDay(new Date(startParam))
        : startOfDay(subDays(now, 29));

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return errorResponse("Invalid date range", 422);
      }
      if (start > end) {
        return errorResponse("startDate must be <= endDate", 422);
      }

      const [payments, bookings] = await Promise.all([
        prisma.payment.findMany({
          where: {
            status: "COMPLETED",
            updatedAt: { gte: start, lte: end },
          },
          select: {
            amount: true,
            updatedAt: true,
            booking: {
              select: {
                room: {
                  select: {
                    roomType: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        }),
        prisma.booking.count({
          where: {
            createdAt: { gte: start, lte: end },
            status: { not: "CANCELLED" },
          },
        }),
      ]);

      // Daily breakdown
      const days = eachDayOfInterval({ start, end });
      const daily = days.map((day) => {
        const dayStart = startOfDay(day);
        const dayEnd = endOfDay(day);
        const total = payments.reduce((sum, p) => {
          if (p.updatedAt >= dayStart && p.updatedAt <= dayEnd) {
            return sum + Number(p.amount);
          }
          return sum;
        }, 0);
        return { date: format(day, "MMM dd"), revenue: total };
      });

      // Top 3 room types
      const typeMap = new Map<
        string,
        { roomType: string; revenue: number }
      >();
      for (const p of payments) {
        const type = p.booking?.room?.roomType;
        if (!type) continue;
        if (!typeMap.has(type.id)) {
          typeMap.set(type.id, { roomType: type.name, revenue: 0 });
        }
        typeMap.get(type.id)!.revenue += Number(p.amount);
      }
      const topRoomTypes = Array.from(typeMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 3);

      // Period totals
      const totalRevenue = payments.reduce(
        (sum, p) => sum + Number(p.amount),
        0
      );
      const avgBookingValue =
        bookings > 0 ? Number((totalRevenue / bookings).toFixed(2)) : 0;

      return successResponse({
        range: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
        totals: {
          totalRevenue,
          totalBookings: bookings,
          avgBookingValue,
        },
        daily,
        topRoomTypes,
      });
    } catch (error) {
      console.error("Admin revenue range error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["ADMIN", "MANAGER"]
);
