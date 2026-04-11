import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";

export const GET = withAuth(
  async () => {
    try {
      const rooms = await prisma.room.findMany({
        where: { isActive: true },
        include: {
          roomType: { select: { name: true, slug: true } },
          bookings: {
            where: { status: "CHECKED_IN" },
            select: {
              id: true,
              bookingRef: true,
              checkOut: true,
              guest: {
                select: { firstName: true, lastName: true },
              },
            },
            take: 1,
          },
        },
        orderBy: [{ floor: "asc" }, { number: "asc" }],
      });

      // Group by floor
      const floorMap = new Map<
        number,
        Array<{
          id: string;
          number: string;
          floor: number;
          status: string;
          roomType: { name: string; slug: string };
          currentGuest?: {
            name: string;
            checkOut: Date;
            bookingRef: string;
          };
        }>
      >();

      for (const room of rooms) {
        const booking = room.bookings[0];
        const entry = {
          id: room.id,
          number: room.number,
          floor: room.floor,
          status: room.status,
          roomType: room.roomType,
          ...(booking
            ? {
                currentGuest: {
                  name: `${booking.guest.firstName} ${booking.guest.lastName}`,
                  checkOut: booking.checkOut,
                  bookingRef: booking.bookingRef,
                },
              }
            : {}),
        };

        if (!floorMap.has(room.floor)) {
          floorMap.set(room.floor, []);
        }
        floorMap.get(room.floor)!.push(entry);
      }

      const floors = Array.from(floorMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([floor, floorRooms]) => ({ floor, rooms: floorRooms }));

      return successResponse({ floors });
    } catch (error) {
      console.error("Room board error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["ADMIN", "MANAGER", "STAFF"]
);
