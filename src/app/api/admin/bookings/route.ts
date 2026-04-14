import { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";

export const GET = withAuth(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const status = searchParams.get("status");
      const search = searchParams.get("search")?.trim();
      const checkInFrom = searchParams.get("checkIn");
      const checkOutTo = searchParams.get("checkOut");
      const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
      const limit = Math.min(
        50,
        Math.max(1, parseInt(searchParams.get("limit") || "15", 10))
      );

      const where: Prisma.BookingWhereInput = {};

      if (status) {
        where.status = status as Prisma.EnumBookingStatusFilter;
      }

      if (checkInFrom) {
        where.checkIn = { gte: new Date(checkInFrom) };
      }
      if (checkOutTo) {
        where.checkOut = { lte: new Date(checkOutTo) };
      }

      if (search) {
        where.OR = [
          { bookingRef: { contains: search, mode: "insensitive" } },
          {
            guest: {
              OR: [
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            },
          },
        ];
      }

      const [total, bookings] = await Promise.all([
        prisma.booking.count({ where }),
        prisma.booking.findMany({
          where,
          include: {
            guest: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            room: {
              select: {
                number: true,
                floor: true,
                roomType: { select: { name: true } },
              },
            },
            payment: { select: { status: true, amount: true, reference: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);

      return successResponse({
        bookings,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Admin list bookings error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["ADMIN", "MANAGER", "STAFF"]
);
