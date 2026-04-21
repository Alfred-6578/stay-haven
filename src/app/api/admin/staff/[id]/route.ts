import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";

export const GET = withAuth<{ id: string }>(
  async (_request: NextRequest, ctx: RouteContext<{ id: string }>) => {
    try {
      const { id } = await ctx.params;

      const user = await prisma.user.findFirst({
        where: { id, isDeleted: false },
        include: { staffProfile: true },
      });

      if (!user) {
        return errorResponse("Staff member not found", 404);
      }

      const { passwordHash: _ph, ...sanitized } = user;
      return successResponse(sanitized);
    } catch (error) {
      console.error("Get staff error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["ADMIN", "MANAGER"]
);

export const PATCH = withAuth<{ id: string }>(
  async (request: NextRequest, ctx: RouteContext<{ id: string }>) => {
    try {
      const { id } = await ctx.params;
      const { isActive, department, role } = await request.json();

      const user = await prisma.user.findFirst({
        where: { id, isDeleted: false },
        include: { staffProfile: true },
      });

      if (!user) {
        return errorResponse("Staff member not found", 404);
      }

      const userUpdate: { isActive?: boolean; role?: "STAFF" | "MANAGER" } = {};
      if (typeof isActive === "boolean") userUpdate.isActive = isActive;
      if (role && ["STAFF", "MANAGER"].includes(role)) userUpdate.role = role;

      const updated = await prisma.user.update({
        where: { id },
        data: {
          ...userUpdate,
          ...(department && user.staffProfile
            ? {
                staffProfile: {
                  update: {
                    department: department as
                      | "FRONT_DESK"
                      | "HOUSEKEEPING"
                      | "MANAGEMENT",
                  },
                },
              }
            : {}),
        },
        include: { staffProfile: true },
      });

      const { passwordHash: _ph, ...sanitized } = updated;
      return successResponse(sanitized, "Staff member updated");
    } catch (error) {
      console.error("Update staff error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["ADMIN", "MANAGER"]
);

export const DELETE = withAuth<{ id: string }>(
  async (_request: NextRequest, ctx: RouteContext<{ id: string }>) => {
    try {
      const { id } = await ctx.params;

      const user = await prisma.user.findFirst({
        where: { id, isDeleted: false },
      });

      if (!user) {
        return errorResponse("Staff member not found", 404);
      }

      await prisma.user.update({
        where: { id },
        data: { isDeleted: true, isActive: false },
      });

      return successResponse(null, "Staff member deleted");
    } catch (error) {
      console.error("Delete staff error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["ADMIN", "MANAGER"]
);
