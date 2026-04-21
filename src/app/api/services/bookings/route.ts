import { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthUser } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";

export const GET = withAuth(
  async (request: NextRequest, _ctx, user: AuthUser) => {
    try {
      const { searchParams } = new URL(request.url);
      const isStaff = ["STAFF", "MANAGER", "ADMIN"].includes(user.role);
      const page = Math.max(
        1,
        parseInt(searchParams.get("page") || "1", 10)
      );
      const limit = Math.min(
        50,
        Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
      );

      const where: Prisma.ServiceBookingWhereInput = {};

      if (!isStaff) {
        where.guestId = user.id;
      }

      const status = searchParams.get("status");
      if (status) {
        where.status = status as Prisma.EnumRequestStatusFilter;
      }

      const dateParam = searchParams.get("date");
      if (dateParam) {
        const d = new Date(dateParam);
        if (!isNaN(d.getTime())) {
          const dayStart = new Date(d);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(d);
          dayEnd.setHours(23, 59, 59, 999);
          where.scheduledAt = { gte: dayStart, lte: dayEnd };
        }
      }

      const category = searchParams.get("category");
      if (category) {
        where.service = { category: category as Prisma.EnumServiceCategoryFilter };
      }

      const [total, bookings] = await Promise.all([
        prisma.serviceBooking.count({ where }),
        prisma.serviceBooking.findMany({
          where,
          include: {
            service: {
              select: {
                id: true,
                name: true,
                category: true,
                price: true,
                image: true,
              },
            },
            booking: {
              select: {
                bookingRef: true,
                room: {
                  select: {
                    number: true,
                    roomType: { select: { name: true } },
                  },
                },
              },
            },
            ...(isStaff
              ? {
                  guest: {
                    select: {
                      firstName: true,
                      lastName: true,
                      email: true,
                    },
                  },
                }
              : {}),
          },
          orderBy: { scheduledAt: "asc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);

      return successResponse({
        bookings,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error("List service bookings error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
);
