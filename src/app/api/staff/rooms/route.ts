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
            where: { status: "CHECKED_IN" },
            select: {
              id: true,
              bookingRef: true,
              checkIn: true,
              checkOut: true,
              guest: { select: { firstName: true, lastName: true } },
            },
            take: 1,
          },
        },
        orderBy: [{ floor: "asc" }, { number: "asc" }],
      });

      const shaped = rooms.map((r) => ({
        id: r.id,
        number: r.number,
        floor: r.floor,
        status: r.status,
        notes: r.notes,
        roomType: r.roomType,
        currentBooking: r.status === "OCCUPIED" ? r.bookings[0] || null : null,
      }));

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
