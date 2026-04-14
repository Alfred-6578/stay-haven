import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";
import {
  format,
  startOfDay,
  endOfDay,
  subDays,
  eachDayOfInterval,
} from "date-fns";

export const GET = withAuth(
  async (_request: NextRequest) => {
    try {
      const now = new Date();

      const [rooms, totalRooms, bookings] = await Promise.all([
        prisma.room.findMany({
          where: { isActive: true },
          select: {
            status: true,
            roomType: { select: { name: true } },
          },
        }),
        prisma.room.count({ where: { isActive: true } }),
        // Pull all bookings that could overlap the 30-day window
        prisma.booking.findMany({
          where: {
            status: { in: ["CHECKED_IN", "CHECKED_OUT"] },
            checkIn: { lte: endOfDay(now) },
            checkOut: { gte: startOfDay(subDays(now, 29)) },
          },
          select: {
            checkIn: true,
            checkOut: true,
            checkInAt: true,
            checkOutAt: true,
            status: true,
          },
        }),
      ]);

      // ── Current by type ────────────────────────────────
      const byTypeMap = new Map<
        string,
        { total: number; occupied: number; available: number; cleaning: number; maintenance: number }
      >();

      for (const room of rooms) {
        const name = room.roomType.name;
        if (!byTypeMap.has(name)) {
          byTypeMap.set(name, { total: 0, occupied: 0, available: 0, cleaning: 0, maintenance: 0 });
        }
        const entry = byTypeMap.get(name)!;
        entry.total += 1;
        if (room.status === "OCCUPIED") entry.occupied += 1;
        else if (room.status === "AVAILABLE") entry.available += 1;
        else if (room.status === "CLEANING") entry.cleaning += 1;
        else if (room.status === "MAINTENANCE") entry.maintenance += 1;
      }

      const currentByType = Array.from(byTypeMap.entries()).map(
        ([roomType, counts]) => ({ roomType, ...counts })
      );

      // ── 30-day trend ───────────────────────────────────
      const start = startOfDay(subDays(now, 29));
      const end = endOfDay(now);
      const days = eachDayOfInterval({ start, end });

      const trend30d = days.map((day) => {
        const dayStart = startOfDay(day);
        const dayEnd = endOfDay(day);

        // A booking counts as "in house" on this day if the stay overlaps it
        // and either it's already been checked in by this point or was checked
        // out afterward.
        const inHouseCount = bookings.reduce((count, b) => {
          const checkedInBy = b.checkInAt || b.checkIn;
          const checkedOutBy = b.checkOutAt || b.checkOut;
          if (checkedInBy <= dayEnd && checkedOutBy >= dayStart) {
            return count + 1;
          }
          return count;
        }, 0);

        const occupancyRate =
          totalRooms > 0
            ? Number(((inHouseCount / totalRooms) * 100).toFixed(2))
            : 0;

        return {
          date: format(day, "MMM dd"),
          occupancyRate,
        };
      });

      return successResponse({ currentByType, trend30d });
    } catch (error) {
      console.error("Admin occupancy stats error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["ADMIN", "MANAGER"]
);
