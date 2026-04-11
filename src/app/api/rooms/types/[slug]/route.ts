import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, RouteContext } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/response";

// GET — public, accepts slug or id
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;

    const roomType = await prisma.roomType.findFirst({
      where: {
        OR: [{ slug }, { id: slug }],
        isActive: true,
      },
      include: {
        rooms: {
          where: { isActive: true },
          select: { id: true, number: true, floor: true, status: true },
          orderBy: { number: "asc" },
        },
      },
    });

    if (!roomType) {
      return errorResponse("Room type not found", 404);
    }

    return successResponse(roomType);
  } catch (error) {
    console.error("Get room type error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// PATCH — ADMIN only
export const PATCH = withAuth<{ slug: string }>(
  async (request: NextRequest, ctx: RouteContext<{ slug: string }>) => {
    try {
      const { slug: id } = await ctx.params;
      const body = await request.json();

      const roomType = await prisma.roomType.findUnique({ where: { id } });
      if (!roomType) {
        return errorResponse("Room type not found", 404);
      }

      const updateData: Record<string, unknown> = {};
      const allowed = [
        "name",
        "description",
        "capacity",
        "amenities",
        "basePrice",
        "weekendMultiplier",
        "images",
        "isActive",
      ];

      for (const key of allowed) {
        if (body[key] !== undefined) updateData[key] = body[key];
      }

      if (body.name && body.name !== roomType.name) {
        updateData.slug = body.name
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .trim();
      }

      const updated = await prisma.roomType.update({
        where: { id },
        data: updateData,
      });

      return successResponse(updated, "Room type updated");
    } catch (error) {
      console.error("Update room type error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["ADMIN"]
);

// DELETE — ADMIN only, soft delete
export const DELETE = withAuth<{ slug: string }>(
  async (_request: NextRequest, ctx: RouteContext<{ slug: string }>) => {
    try {
      const { slug: id } = await ctx.params;

      const roomType = await prisma.roomType.findUnique({
        where: { id },
        include: {
          rooms: {
            include: {
              bookings: {
                where: {
                  status: { in: ["CONFIRMED", "CHECKED_IN", "PENDING"] },
                },
                select: { id: true },
              },
            },
          },
        },
      });

      if (!roomType) {
        return errorResponse("Room type not found", 404);
      }

      const hasActiveBookings = roomType.rooms.some(
        (r) => r.bookings.length > 0
      );
      if (hasActiveBookings) {
        return errorResponse(
          "Cannot delete type with active bookings",
          409
        );
      }

      await prisma.roomType.update({
        where: { id },
        data: { isActive: false },
      });

      return successResponse(null, "Room type deleted");
    } catch (error) {
      console.error("Delete room type error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["ADMIN"]
);
