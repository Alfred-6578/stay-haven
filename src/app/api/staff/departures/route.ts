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

      const end = new Date(target);
      end.setHours(23, 59, 59, 999);

      const departures = await prisma.booking.findMany({
        where: {
          status: "CHECKED_IN",
          checkOut: { lte: end },
        },
        include: {
          guest: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
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
          roomServiceOrders: {
            where: { status: { not: "DELIVERED" } },
            select: {
              id: true,
              status: true,
              totalAmount: true,
              createdAt: true,
            },
          },
        },
        orderBy: { checkOut: "asc" },
      });

      return successResponse(departures);
    } catch (error) {
      console.error("Staff departures error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["STAFF", "MANAGER", "ADMIN"]
);
