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
      const page = Math.max(
        1,
        parseInt(searchParams.get("page") || "1", 10)
      );
      const limit = Math.min(
        50,
        Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
      );

      const where: Prisma.RoomUpgradeRequestWhereInput = {};
      if (status) {
        where.status = status as Prisma.EnumRequestStatusFilter;
      }

      const [total, upgrades] = await Promise.all([
        prisma.roomUpgradeRequest.count({ where }),
        prisma.roomUpgradeRequest.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            booking: {
              select: {
                bookingRef: true,
                checkIn: true,
                checkOut: true,
                totalNights: true,
                status: true,
                guest: {
                  select: { firstName: true, lastName: true, email: true },
                },
              },
            },
            currentRoom: {
              select: {
                number: true,
                floor: true,
                roomType: { select: { name: true, basePrice: true } },
              },
            },
            requestedType: {
              select: { name: true, basePrice: true, image: true },
            },
            processedBy: {
              select: { firstName: true, lastName: true },
            },
          },
        }),
      ]);

      return successResponse({
        upgrades,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Admin upgrades list error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["ADMIN", "MANAGER", "STAFF"]
);
