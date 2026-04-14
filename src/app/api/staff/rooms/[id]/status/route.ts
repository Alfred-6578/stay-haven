import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";

const ALLOWED_STATUSES = ["AVAILABLE", "CLEANING", "MAINTENANCE"] as const;
type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

export const PATCH = withAuth<{ id: string }>(
  async (request: NextRequest, ctx: RouteContext<{ id: string }>) => {
    try {
      const { id } = await ctx.params;
      const body = await request.json();
      const { status, notes } = body as { status?: string; notes?: string };

      if (!status || !ALLOWED_STATUSES.includes(status as AllowedStatus)) {
        return errorResponse(
          `status must be one of: ${ALLOWED_STATUSES.join(", ")}`,
          422
        );
      }

      const room = await prisma.room.findUnique({ where: { id } });
      if (!room) {
        return errorResponse("Room not found", 404);
      }

      const updateData: { status: AllowedStatus; notes?: string | null } = {
        status: status as AllowedStatus,
      };

      if (status === "AVAILABLE") {
        updateData.notes = null;
      } else if (notes !== undefined) {
        updateData.notes = notes || null;
      }

      const updated = await prisma.room.update({
        where: { id },
        data: updateData,
        include: { roomType: { select: { name: true, basePrice: true } } },
      });

      return successResponse(updated, "Room status updated");
    } catch (error) {
      console.error("Staff room status error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["STAFF", "MANAGER", "ADMIN"]
);
