import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";

// GET — public
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const room = await prisma.room.findFirst({
      where: { id, isActive: true },
      include: { roomType: true },
    });

    if (!room) {
      return errorResponse("Room not found", 404);
    }

    return successResponse(room);
  } catch (error) {
    console.error("Get room error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// PATCH — ADMIN/STAFF
export const PATCH = withAuth<{ id: string }>(
  async (request: NextRequest, ctx: RouteContext<{ id: string }>) => {
    try {
      const { id } = await ctx.params;
      const body = await request.json();

      const room = await prisma.room.findFirst({
        where: { id, isActive: true },
      });
      if (!room) {
        return errorResponse("Room not found", 404);
      }

      if (body.status === "OCCUPIED") {
        return errorResponse(
          "Cannot set OCCUPIED directly — use the check-in flow",
          422
        );
      }

      const updateData: Record<string, unknown> = {};
      if (body.status) updateData.status = body.status;
      if (body.notes !== undefined) updateData.notes = body.notes;
      if (body.floor !== undefined) updateData.floor = body.floor;

      const updated = await prisma.room.update({
        where: { id },
        data: updateData,
        include: { roomType: true },
      });

      return successResponse(updated, "Room updated");
    } catch (error) {
      console.error("Update room error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["ADMIN", "MANAGER", "STAFF"]
);

// DELETE — ADMIN only, soft delete
export const DELETE = withAuth<{ id: string }>(
  async (_request: NextRequest, ctx: RouteContext<{ id: string }>) => {
    try {
      const { id } = await ctx.params;

      const room = await prisma.room.findFirst({
        where: { id, isActive: true },
        include: {
          bookings: {
            where: {
              status: { in: ["CONFIRMED", "CHECKED_IN", "PENDING"] },
            },
            select: { id: true },
          },
        },
      });

      if (!room) {
        return errorResponse("Room not found", 404);
      }

      if (room.bookings.length > 0) {
        return errorResponse("Cannot delete room with active bookings", 409);
      }

      await prisma.room.update({
        where: { id },
        data: { isActive: false },
      });

      return successResponse(null, "Room deleted");
    } catch (error) {
      console.error("Delete room error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["ADMIN"]
);
