import { NextRequest } from "next/server";
import { differenceInHours } from "date-fns";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";

export const GET = withAuth(
  async (_request: NextRequest) => {
    try {
      const now = new Date();

      const overstays = await prisma.booking.findMany({
        where: {
          status: "CHECKED_IN",
          checkOut: { lt: now },
        },
        orderBy: { checkOut: "asc" },
        select: {
          id: true,
          bookingRef: true,
          checkOut: true,
          guest: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          room: { select: { number: true } },
        },
      });

      const data = overstays.map((b) => ({
        booking: { id: b.id, bookingRef: b.bookingRef },
        guest: b.guest,
        room: b.room,
        originalCheckOut: b.checkOut,
        overstayHours: differenceInHours(now, b.checkOut),
      }));

      return successResponse(data);
    } catch (error) {
      console.error("Overstay check error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["ADMIN", "MANAGER"]
);
