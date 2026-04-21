import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";

export const GET = withAuth(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const q = (searchParams.get("q") || "").trim();

      if (!q) {
        return successResponse([]);
      }

      // Find matching bookings by ref
      const bookingMatches = await prisma.booking.findMany({
        where: { bookingRef: { contains: q, mode: "insensitive" } },
        select: { guestId: true },
      });
      const guestIdsFromBookings = [
        ...new Set(bookingMatches.map((b) => b.guestId)),
      ];

      const users = await prisma.user.findMany({
        where: {
          role: "GUEST",
          isDeleted: false,
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { id: { in: guestIdsFromBookings } },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          avatar: true,
          guestProfile: {
            select: { loyaltyTier: true, totalStays: true, totalPoints: true },
          },
          bookings: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              bookingRef: true,
              status: true,
              checkIn: true,
              checkOut: true,
              room: {
                select: {
                  number: true,
                  roomType: { select: { name: true } },
                },
              },
            },
          },
        },
        take: 30,
      });

      const shaped = users.map((u) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        phone: u.phone,
        avatar: u.avatar,
        guestProfile: u.guestProfile,
        latestBooking: u.bookings[0] || null,
      }));

      return successResponse(shaped);
    } catch (error) {
      console.error("Staff guest search error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["STAFF", "MANAGER", "ADMIN"]
);
