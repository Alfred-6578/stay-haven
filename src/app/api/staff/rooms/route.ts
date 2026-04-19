import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";

export const GET = withAuth(
  async (_request: NextRequest) => {
    try {
      const rooms = await prisma.room.findMany({
        where: { isActive: true },
        include: {
          roomType: { select: { name: true, basePrice: true } },
          bookings: {
            where: {
              // Include CHECKED_IN + CONFIRMED (could be no-show or pending check-in)
              status: { in: ["CHECKED_IN", "CONFIRMED"] },
            },
            select: {
              id: true,
              bookingRef: true,
              status: true,
              checkIn: true,
              checkOut: true,
              guest: { select: { firstName: true, lastName: true } },
            },
            orderBy: { checkIn: "desc" },
            take: 1,
          },
        },
        orderBy: [{ floor: "asc" }, { number: "asc" }],
      });

      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);

      const shaped = rooms.map((r) => {
        const booking = r.bookings[0] || null;

        // Determine if this is a no-show situation:
        // Room has a CONFIRMED booking whose check-in date has passed
        const isNoShow =
          booking &&
          booking.status === "CONFIRMED" &&
          new Date(booking.checkIn) < startOfToday;

        return {
          id: r.id,
          number: r.number,
          floor: r.floor,
          status: r.status,
          notes: r.notes,
          roomType: r.roomType,
          currentBooking: booking,
          bookingStatus: booking?.status || null,
          isNoShow: !!isNoShow,
        };
      });

      const floorMap = new Map<number, typeof shaped>();
      for (const room of shaped) {
        if (!floorMap.has(room.floor)) floorMap.set(room.floor, []);
        floorMap.get(room.floor)!.push(room);
      }

      const floors = Array.from(floorMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([floor, rooms]) => ({ floor, rooms }));

      return successResponse({ floors });
    } catch (error) {
      console.error("Staff rooms error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["STAFF", "MANAGER", "ADMIN"]
);
