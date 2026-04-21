import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";

export const GET = withAuth(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const dateParam = searchParams.get("date");
      const target = dateParam ? new Date(dateParam) : new Date();
      if (isNaN(target.getTime())) {
        return errorResponse("Invalid date", 422);
      }

      const start = new Date(target);
      start.setHours(0, 0, 0, 0);
      const end = new Date(target);
      end.setHours(23, 59, 59, 999);

      const arrivals = await prisma.booking.findMany({
        where: {
          status: "CONFIRMED",
          checkIn: { gte: start, lte: end },
        },
        include: {
          guest: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              guestProfile: {
                select: { idNumber: true, idType: true, preferences: true },
              },
            },
          },
          room: {
            select: {
              id: true,
              number: true,
              floor: true,
              roomType: { select: { name: true } },
            },
          },
          payment: { select: { status: true, reference: true } },
        },
        orderBy: { checkIn: "asc" },
      });

      return successResponse(arrivals);
    } catch (error) {
      console.error("Staff arrivals error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["STAFF", "MANAGER", "ADMIN"]
);
