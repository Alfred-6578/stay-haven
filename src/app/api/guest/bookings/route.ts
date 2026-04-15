import { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";

export const GET = withAuth(
  async (request: NextRequest, _ctx, user: AuthUser) => {
    try {
      const { searchParams } = new URL(request.url);
      const status = searchParams.get("status");
      const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
      const limit = Math.min(
        50,
        Math.max(1, parseInt(searchParams.get("limit") || "10", 10))
      );

      const groupRef = searchParams.get("groupRef");

      const where: Prisma.BookingWhereInput = { guestId: user.id };
      if (status) {
        where.status = status as Prisma.EnumBookingStatusFilter;
      }
      if (groupRef) {
        where.groupRef = groupRef;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [total, bookings] = await Promise.all([
        prisma.booking.count({ where }),
        prisma.booking.findMany({
          where,
          include: {
            room: {
              select: {
                number: true,
                floor: true,
                roomType: {
                  select: { name: true, slug: true, image: true },
                },
              },
            },
            payment: { select: { status: true, amount: true } },
          },
          orderBy: { checkIn: "asc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);

      const upcoming = bookings.filter(
        (b) =>
          new Date(b.checkIn) >= today &&
          ["PENDING", "CONFIRMED", "CHECKED_IN"].includes(b.status)
      );
      const past = bookings.filter(
        (b) =>
          !upcoming.includes(b)
      );

      return successResponse({
        upcoming,
        past,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Guest bookings error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
);
