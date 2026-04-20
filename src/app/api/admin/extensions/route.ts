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

      const where: Prisma.StayExtensionWhereInput = {};
      if (status) {
        where.status = status as Prisma.EnumRequestStatusFilter;
      }

      const [total, extensions] = await Promise.all([
        prisma.stayExtension.count({ where }),
        prisma.stayExtension.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            booking: {
              select: {
                id: true,
                bookingRef: true,
                checkIn: true,
                status: true,
                guest: {
                  select: { firstName: true, lastName: true, email: true },
                },
                room: {
                  select: {
                    number: true,
                    roomType: { select: { name: true } },
                  },
                },
              },
            },
          },
        }),
      ]);

      return successResponse({
        extensions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Admin extensions list error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["ADMIN", "MANAGER", "STAFF"]
);
