import { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";

export const GET = withAuth(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const search = searchParams.get("search")?.trim();
      const department = searchParams.get("department");
      const isActiveParam = searchParams.get("isActive");
      const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
      const pageSize = 15;

      const where: Prisma.UserWhereInput = {
        role: { in: ["STAFF", "MANAGER"] },
        isDeleted: false,
      };

      if (isActiveParam !== null) {
        where.isActive = isActiveParam === "true";
      }

      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ];
      }

      if (department) {
        where.staffProfile = {
          department: department as
            | "FRONT_DESK"
            | "HOUSEKEEPING"
            | "MANAGEMENT",
        };
      }

      const [total, staff] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          include: { staffProfile: true },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);

      const sanitized = staff.map(({ passwordHash: _ph, ...u }) => u);

      return successResponse({
        staff: sanitized,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    } catch (error) {
      console.error("List staff error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["ADMIN", "MANAGER"]
);
